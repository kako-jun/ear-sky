# Architecture

## System Overview

```
[Browser] → [CF Pages (static SPA)] → [Pages Functions (Hono API)] → [D1 (SQLite)]
                                   ↕
                          [YouTube/Niconico/SoundCloud embedded players]
                          [Nostalgic Counter API]
                          [noembed.com (oEmbed proxy)]
                          [/share/:id → Dynamic OGP (bot meta tags)]
                          [/pickups/*.json → Static pickup data]
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/posts | List posts (?sort=new\|likes&q=&sourceLang=&targetLang=&tags=&limit&offset) |
| GET | /api/posts/:id | Get single post |
| POST | /api/posts | Create post (rate limit: 30s/1 per IP) |
| DELETE | /api/posts/:id | Delete post (deleteKey required) |
| PUT | /api/posts/:id/reaction | Set/switch emoji reaction (1 per user per post) |
| DELETE | /api/posts/:id/reaction | Remove your reaction |
| POST | /api/posts/:id/play | Increment play count (fire-and-forget) |
| GET | /share/:id | Dynamic OGP for bots, redirect for browsers |

## Playback Architecture (mount-on-click)

Player iframes are created **only when the user clicks play**. No pre-mounting.

Pre-mounting was tried and failed in all forms:
- **Hidden iframes** (display:none, clip-path, visibility:hidden) → YouTube/Niconico/SoundCloud JS callbacks (onStateChange, onReady, PLAY_PROGRESS) stop firing
- **Visible pre-mount** (multiple iframes on page) → YouTube's concurrent player initialization fails with postMessage origin errors; 3rd+ players break

### Current flow

1. **API script pre-load**: IntersectionObserver (400px margin) triggers `preloadYTApi()` which loads the YouTube IFrame API script (no iframe). Lightweight, shared across all cards
2. **User clicks play** → `setExpanded(true)` → player component mounts → iframe created
3. **YouTube**: `autoplay:1` in playerVars. Browser's user activation window (~5s after click) allows autoplay inside the iframe. `start` param seeks to `startSec - 5s` (PRE_MARGIN)
4. **Niconico**: `autoplay=1` in embed URL + `doPlay()` on iframe load (postMessage seek+play)
5. **SoundCloud**: `auto_play=true` in embed URL + `seekTo(startSec)` on READY event
6. **onStateChange/PLAYING** fires → `hasPlayed=true` → interaction overlay appears (blocks iframe clicks, enables stoppable mode for editor preview)
7. **Timer** (100ms interval) polls `getCurrentTime()` → drives Subtitle sweep + segment end detection
8. **Segment end**: `currentTime >= endSec + 0.3s` → pause + collapse (setExpanded=false)

### Autoplay fallback

If autoplay is blocked (e.g. LINE in-app browser), the interaction overlay is NOT shown until `hasPlayed=true`. The user can click YouTube's native play button directly. Once playback starts, the overlay activates.

### Platform-specific details

| | YouTube | Niconico | SoundCloud |
|---|---|---|---|
| API | IFrame API (global script) | Direct iframe embed | Widget API (script) |
| Play | autoplay:1 (iframe param) | autoplay=1 + doPlay() on load | auto_play=true + seekTo on READY |
| Time tracking | getCurrentTime() poll (100ms) | Date.now() elapsed estimation | PLAY_PROGRESS event |
| Segment end | pauseVideo() | postMessage pause | widget.pause() |
| Time values | Seconds | Seconds | Milliseconds |

## Header (position: fixed)

The header uses `position: fixed` (not sticky) with a spacer div measured once on mount.

`position: sticky` was tried and failed: height changes (shrink ↔ expand) cause scroll-position feedback loops. The sticky element's reserved flow space changes → document height changes → browser scroll anchoring adjusts scrollY → crosses threshold → re-toggles → oscillation (3+ times per scroll).

- `useShrunk()` hook: shrink at scrollY > 80px, expand at scrollY < 40px (hysteresis)
- Expanded content (subtitle, alias, decorative line) uses `max-h-0 overflow-hidden` (not conditional rendering) to avoid DOM churn
- `transition-colors duration-300` on the wrapper for background/blur/shadow fade

## Subtitle System

- **Multiple cues per post**: stored in `cues` table (migration 0004)
- **Type**: `SubtitleCue { text, originalText?, showAt, duration }`
- **Rendering**: `useLayoutEffect` (not useEffect) measures text width and auto-scales font size (base 1.875rem → floor 1.25rem, wraps beyond). The early return `if (!hasCues) return null` is placed AFTER the hook to prevent React Error #310
- **Karaoke sweep**: `background-clip: text` with `background-position` driven by `currentTime`. 2% gradient band at the sweep edge for smooth transition
- **Backdrop**: 1.5s fade-in before first cue (opacity ramp on background + blur)

## Spoiler/Reveal

- PostCard hides cue texts initially
- Reveal fires when playback reaches end of the LAST cue (not first)
- In preview mode (`preview=true`), revealed from the start
- Pre-margin: 5s before startSec. Post-margin: 0.3s after endSec

## Reaction System

- 12 curated emoji, user picks ONE per post
- Default: 🎵 auto-seeded on post creation (Reddit-style initial score)
- Server: `UNIQUE(post_id, ip_hash)` — PUT switches, DELETE removes
- Client: localStorage tracks `{ postId: emoji }` map

## Pickup Corner

- Monthly JSONs in `public/pickups/` (generated locally → git commit → deploy)
- Master (wine icon, blue) introduces songs → video plays → cue reveal triggers banter
- Share URL: `/share/${pick.postId}` (OGP-compatible)
- Cue fallback: synthesizes single cue from `misheardText/startSec/endSec` when `cues` is absent

## PostEditor

- Wizard flow: URL → song info (oEmbed auto-fill) → cues (DualRangeSlider) → about you
- Preview via `PostCard(preview=true)` — no direct player usage
- Delete key: localStorage pre-fill, type=password
- Cue editing: changing cue N's start auto-updates cue N-1's end

## i18n

- English default, Japanese translation
- `useI18n()` hook, locale toggle in header (Globe icon, EN↔JA, localStorage)
- Decorative dashes replaced with CSS gradient lines (Header alias, PickupCorner closing, Footer)

## Service Worker

- `public/sw.js`: network-first with cache fallback for same-origin static assets
- **Must skip third-party origins** (`url.origin !== self.location.origin`) — otherwise Cloudflare analytics, YouTube CDN etc. cause "Failed to convert value to Response"
- API calls (`/api/`) are network-only
- Cache name includes build date for automatic invalidation

## Security

- Input validation: type/length/enum checks, URL protocol check (https/http only)
- Rate limiting: IP hash-based, 30s cooldown
- XSS prevention: OGP HTML escaping, URL protocol check
- CORS: production domains only
- Reaction dedup: server UNIQUE constraint + client localStorage

## Database Schema

### posts
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| video_url, platform, video_id | TEXT | Video source |
| start_sec, end_sec | REAL | Segment boundaries |
| misheard_text, original_text | TEXT | Cue text (legacy single-cue) |
| artist_name, song_title | TEXT | Song metadata |
| source_lang, target_lang | TEXT | Language pair |
| nickname, ip_hash, delete_key | TEXT | Poster info |
| era, comment | TEXT? | Optional metadata |
| play_count | INTEGER | DEFAULT 0 |
| created_at | TEXT | Timestamp |

### cues (migration 0004)
| Column | Type | Notes |
|---|---|---|
| post_id | TEXT FK CASCADE | Parent post |
| text, original_text | TEXT | Subtitle content |
| show_at, duration | REAL | Timing |
| sort_order | INTEGER | Display order |

### reactions (migration 0003, CASCADE via 0007)
UNIQUE(post_id, ip_hash). Columns: post_id FK, reaction_key (emoji), ip_hash.

### post_tags (migration 0006, CASCADE via 0007)
UNIQUE(post_id, tag). 10 valid tags: anime/game/vocaloid/movie/drama/cm/rock/pop/hiphop/metal.

## Design Theme

- Background: night-deep → bar-wall gradient + day-rotating Gemini images (7 webp)
- Accents: Neon Pink (#ff2d78), Neon Blue (#00d4ff), Neon Yellow (#ffe156)
- Text contrast: white/50+ for interactive (WCAG AA)
- Icon: Copilot cloud-cat-ear mascot
- `prefers-reduced-motion` supported
- Mobile: `100lvh` prevents address bar jitter
