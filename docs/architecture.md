# Architecture

## Overview

```
[Browser] → [CF Pages (static SPA)] → [Pages Functions (Hono API)] → [D1 (SQLite)]
                                   ↕
                          [YouTube/Niconico/SoundCloud embedded players]
                          [Nostalgic Counter API]
                          [noembed.com (oEmbed proxy)]
                          [/share/:id → Dynamic OGP (bot meta tags)]
                          [/pickups/*.json → Static pickup data]
```

## Data Flow

### Posting (Wizard Flow)
1. User pastes a video URL → instant preview loads (URL未入力時はYouTube/niconico/SoundCloudへのExternalLink付きリンクを表示)
2. URL parsed to extract platform/videoId/startSec (`video.ts` — YouTube `/watch?v=`, `/shorts/`, `/live/`, `/embed/`, `youtu.be/`, `?list=...&v=...` 対応; `?t=`/`&t=`/`?start=` で開始時刻取得; niconico `?from=` も同様; SoundCloud URLs via `soundcloud.com/:artist/:track`)
3. **Song info step**: Video title auto-fetched via oEmbed → artist/song auto-filled (user can correct)
4. **Cues step**: User defines 1–3 subtitle cues via DualRangeSlider (dual-thumb, ◀▶ 1s adjust, drag→seekTo)
   - If URL has `?t=`/`?start=`/`?from=`, first cue's start/end are auto-initialized from that time
   - First cue: specify start + end
   - Additional cues (+ button, max 3): start = previous cue's end, only end is specified
5. **About you step**: Nickname, delete key, comment (optional fields styled neon-blue/40)
6. POST /api/posts → saved to D1 (post row + cues rows, with IP hash)
7. Immediately appears in feed

### Playback (YouTube) — via VideoSegment
1. VideoSegment (shared component) renders thumbnail before expansion
2. Tap thumbnail → iframe loads; first play via iframe's built-in controls (autoplay policy)
3. YouTube IFrame API with margins (start - 5s, end + 1s), disablekb:1
4. onTimeUpdate passes currentTime to Subtitle; active cue determined by `currentTime >= cue.showAt`
5. Karaoke sweep progress = `(currentTime - showAt) / duration`, applied as inline `background-position`
6. Auto-stops 1 second after segment end
7. After first play: overlay with replay icon blocks iframe, forces replay via API

### Playback (Niconico)
1. embed.nicovideo.jp iframe (commentLayerMode=0, comments OFF)
2. postMessage API for seek+play control, same pre/post margins as YouTube
3. Simulated time updates (Date.now-based) for subtitle sync
4. Timer-based segment end detection

### Playback (SoundCloud)
1. SoundCloud Widget API (`w.soundcloud.com/player`) embedded via iframe
2. `seekTo` for segment start, `PLAY_PROGRESS` event for time tracking and subtitle sync
3. Same pre/post margins as YouTube/Niconico for segment playback
4. `segmentEndedRef` prevents multi-fire of segment end detection

### Spoiler/Reveal
1. PostCard initially hides cue texts
2. Reveal triggers: playback reaches end of LAST cue (via VideoSegment onCueReached) — no manual reveal button, playback only
3. Text appears with fade-in animation
4. Karaoke subtitle plays during each cue with time-synced sweep (progress-based), stays visible after sweep

### Reactions (Emoji Picker)
1. User taps "+reaction" label (shown when 0 reactions) or "+" button → emoji picker popover with 12 curated emoji
2. Each user (IP) can pick exactly ONE emoji per post
3. Clicking a different emoji switches the reaction
4. Clicking the current emoji removes it (toggle off)
5. Optimistic UI update + server sync via PUT/DELETE /api/posts/:id/reaction
6. localStorage tracks the user's emoji per post
7. Server enforces UNIQUE(post_id, ip_hash) constraint

### Pickup Corner
1. Fetch `public/pickups/index.json` for available pickup IDs
2. Load latest pickup JSON
3. Display in same card layout as regular posts (VideoSegment shared component)
4. Master intro (1曲目「まずは」, 2曲目以降「続いては」) → video plays → cue区間到達で空耳テキスト+掛け合い(banter)が自動展開（専用revealボタンなし、再生で自動展開）
5. "Jump to latest posts" link above pickup corner for quick navigation
6. Gradient divider + spacing separates pickup corner from new posts below
7. Pickup date shows "updated" label
8. Past pickups lazy-loaded on demand

### Dynamic OGP
1. Access `/share/:id`
2. Bot detection via User-Agent
3. Bot: fetch post from D1 → return HTML with OGP meta tags
4. Browser: redirect to `/#post-{id}`

## i18n

- English is the default language
- Japanese detected via `navigator.language`
- All UI strings externalized in `src/i18n/en.ts` and `src/i18n/ja.ts`
- `useI18n()` hook provides messages to components
- Language toggle implemented in header right (globe icon, EN↔JA cycle, saved to localStorage)

## Table Schema

### posts
| Column | Type | Description |
|---|---|---|
| id | TEXT PK | UUID |
| video_url | TEXT | Original video URL |
| platform | TEXT | youtube / niconico / soundcloud / other |
| video_id | TEXT | Platform-specific ID |
| start_sec | REAL | Start second |
| end_sec | REAL | End second |
| misheard_text | TEXT | Misheard text |
| original_text | TEXT? | Original lyrics |
| artist_name | TEXT | Artist name |
| song_title | TEXT | Song title |
| source_lang | TEXT | Original language |
| target_lang | TEXT | Target language |
| nickname | TEXT | Poster nickname |
| likes | INTEGER | Legacy (unused, kept for compat) |
| ip_hash | TEXT | Poster IP hash |
| delete_key | TEXT? | Deletion key |
| era | TEXT? | Era/year (e.g. "1985", "90s") |
| comment | TEXT? | One-liner comment |
| play_count | INTEGER | Play count (DEFAULT 0) |
| created_at | TEXT | Created timestamp |

### reactions
| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| post_id | TEXT FK | Post ID |
| reaction_key | TEXT | Emoji character (e.g. "👂", "🤣", "❤️") |
| ip_hash | TEXT | Reactor IP hash |
| created_at | TEXT | Timestamp |

**Constraints:** UNIQUE(post_id, ip_hash) — one reaction per user per post. `post_id` FK has ON DELETE CASCADE (migration 0007).

### cues
| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| post_id | TEXT FK | Post ID (CASCADE delete) |
| text | TEXT | Misheard/subtitle text |
| original_text | TEXT? | Original lyrics |
| show_at | REAL | Time (seconds) when cue appears |
| duration | REAL | Cue duration (seconds) for sweep |
| sort_order | INTEGER | Display order (0-based) |
| created_at | TEXT | Timestamp |

**Index:** `idx_cues_post_id` on `post_id`.
**Migration (0004):** Existing posts' `misheard_text + start_sec + end_sec` auto-migrated to one cue each.

### post_tags
| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| post_id | TEXT FK | Post ID (ON DELETE CASCADE) |
| tag | TEXT | Tag string |
| created_at | TEXT | Timestamp |

**Constraints:** UNIQUE(post_id, tag) — one tag per post per value. `post_id` FK has ON DELETE CASCADE (migration 0007).

## Search & Pagination

- `GET /api/posts` supports query parameters:
  - `q` — text search (LIKE with proper escape of `%`, `_`, `\`)
  - `sourceLang` — filter by source language
  - `targetLang` — filter by target language
  - `tags` — comma-separated tags (validated against VALID_TAGS whitelist, max 3)
- Pagination via `limit`/`offset`, `PAGE_SIZE=10`
- 4 tabs in the UI: feed / fame / search / post

## Sticky Header

- Header shrinks on scroll (threshold >80px): icon 48→24px, title 2xl→sm, alias/subtitle hidden
- Header + nav wrapped in sticky container (`z-40`)
- Click title to scroll to top

## Extracted Components

- `EmptyState.tsx` — empty state display
- `ShareButton.tsx` — share/link copy button
- `Paginator.tsx` — pagination controls
- `RankingList.tsx` — fame/ranking tab list
- `Footer.tsx` — site footer

## Migrations

| Migration | Description |
|---|---|
| 0004 | Cues table + auto-migration from legacy fields |
| 0006_tags.sql | `post_tags` table (id, post_id FK CASCADE, tag, UNIQUE(post_id, tag)) |
| 0007_cascade_delete.sql | Rebuild reactions/post_tags FKs with ON DELETE CASCADE |
