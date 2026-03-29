# Ear in the Sky Diamond — Development Guide

## Design Philosophy

- **No content hosting**: Videos/audio via external platform embeds only. Copyright-safe
- **Anonymous & lightweight**: No user registration, no personal info
- **Late-night TV tone**: Neon signs, night bar street. Not too polished, approachable
- **Mobile-first**: 44px tap targets, all operations possible on phones
- **English as default**: i18n with English base, Japanese translation

## Project Structure

```
src/
├── App.tsx              # Main SPA (tabs: New/Hall of Fame/Search/Post)
├── main.tsx             # Entry point + SW registration
├── index.css            # Tailwind + neon theme + fixed-header positioning
├── types/index.ts       # Post, SubtitleCue, Draft, Pickup, VALID_TAGS, PAGE_SIZE
├── i18n/                # en.ts (default), ja.ts, useI18n() hook
├── lib/
│   ├── api.ts           # D1 API client (fetch wrapper, ApiError)
│   ├── storage.ts       # localStorage (drafts + reaction tracking)
│   ├── video.ts         # URL parsing (YouTube/Niconico/SoundCloud), time formatting
│   └── oembed.ts        # Video title auto-fetch
├── components/
│   ├── Header.tsx       # Neon title + fixed header (useShrunk: 80px shrink / 40px expand)
│   ├── VideoSegment.tsx # Shared video+subtitle (mount-on-click, see docs/architecture.md)
│   ├── YouTubePlayer.tsx    # YouTube IFrame API (autoplay:1, segment playback)
│   ├── NiconicoPlayer.tsx   # Niconico embed (postMessage control)
│   ├── SoundCloudPlayer.tsx # SoundCloud Widget API
│   ├── Subtitle.tsx     # Karaoke subtitle (useLayoutEffect for font sizing)
│   ├── PostEditor.tsx   # Wizard form (URL→info→cues→about you), preview via PostCard
│   ├── PostCard.tsx     # Post display (spoiler→reveal on playback)
│   ├── PickupCorner.tsx # Featured picks with master/regular banter
│   ├── Reactions.tsx    # Emoji picker (12 emoji, 1 per user per post)
│   └── ...              # EmptyState, ShareButton, Paginator, RankingList, Footer, Toast, etc.
functions/
├── api/[[route]].ts     # Hono API routes (Pages Functions)
└── share/[id].ts        # Dynamic OGP (bot meta tags + user redirect)
public/
├── pickups/             # Pickup JSONs (index.json + monthly data)
├── bg/                  # Night backgrounds (bg-0~6.webp, day rotation)
└── sw.js                # Service worker (same-origin only, build-date cache key)
migrations/              # D1 schema (0001–0007)
```

## Critical Constraints

These are hard-won lessons. Violating them WILL break the app:

1. **Player iframes: mount-on-click only** — Pre-mounting multiple iframes fails:
   hidden iframes (display:none/clip-path/visibility) break JS callbacks;
   visible pre-mount hits YouTube's concurrent player limit. Instead, pre-load
   the YouTube API *script* only, and create the iframe on click with `autoplay:1`.
   See `docs/architecture.md § Playback` for details.

2. **Subtitle hooks: no early return before useLayoutEffect** — `Subtitle.tsx`
   must call all hooks unconditionally. Moving the `if (!hasCues) return null`
   before hooks causes React Error #310 when cues change from empty to non-empty.

3. **Header: position:fixed, not sticky** — `position:sticky` with height changes
   causes scroll-position feedback loops (3+ oscillations per scroll). Using
   `position:fixed` + a spacer div (measured once on mount) eliminates this.

4. **Service worker: same-origin only** — `sw.js` must skip `url.origin !== self.location.origin`
   before `event.respondWith()`. Without this, Cloudflare analytics and YouTube
   CDN requests fail with "Failed to convert value to Response".

5. **Interaction overlay: defer until hasPlayed** — The overlay that blocks iframe
   clicks must not appear until playback actually starts. Otherwise, if autoplay
   is blocked (e.g. LINE browser), the user can't reach YouTube's native play button.

## Detailed Documentation

| Document | Content |
|---|---|
| `docs/architecture.md` | System architecture, playback flow, DB schema, API, security |
| `docs/user-guide.md` | How to use the app (posting, playing, search, reactions) |
| `docs/bg-prompts.md` | Gemini prompts for background images |
| `README.md` | Public-facing overview |

## Cloudflare Config

- D1 database: ear-sky-db (fcbfc739-0198-4d71-a2a7-915411fdb563)
- Nostalgic counter ID: ear-sky-eaae1797
- Custom domain: ear-sky.llll-ll.com
- GitHub integration: auto-deploy on push
