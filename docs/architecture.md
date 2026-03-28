# Architecture

## Overview

```
[Browser] → [CF Pages (static SPA)] → [Pages Functions (Hono API)] → [D1 (SQLite)]
                                   ↕
                          [YouTube/Niconico embedded players]
                          [Nostalgic Counter API]
                          [noembed.com (oEmbed proxy)]
                          [/share/:id → Dynamic OGP (bot meta tags)]
                          [/pickups/*.json → Static pickup data]
```

## Data Flow

### Posting
1. User enters URL + time range + misheard text
2. URL parsed to extract platform/videoId (`video.ts`)
3. Video title auto-fetched via oEmbed → split into artist/song
4. Preview with YouTube segment playback + subtitle
5. POST /api/posts → saved to D1 (with IP hash, optional era/comment)
6. Immediately appears in feed

### Playback (YouTube)
1. Tap play button on PostCard
2. YouTube IFrame API initializes player (start/end specified)
3. Playback starts at segment beginning
4. Subtitle fades in 0.5s after playback with karaoke sweep (white→yellow)
5. Auto-stops at end second

### Playback (Niconico)
1. embed.nicovideo.jp iframe (commentLayerMode=0, comments OFF)
2. postMessage API for seek+play control
3. Timer-based segment end detection
4. Same Subtitle overlay as YouTube

### Spoiler/Reveal
1. PostCard initially hides misheard text (shows "???")
2. Reveal triggers: video starts playing OR "Show mishearing" button
3. Text appears with fade-in animation
4. Karaoke subtitle still plays separately during video playback

### Reactions (Emoji Picker)
1. User taps "+" button → emoji picker popover with 16 curated emoji
2. Each user (IP) can pick exactly ONE emoji per post
3. Clicking a different emoji switches the reaction
4. Clicking the current emoji removes it (toggle off)
5. Optimistic UI update + server sync via PUT/DELETE /api/posts/:id/reaction
6. localStorage tracks the user's emoji per post
7. Server enforces UNIQUE(post_id, ip_hash) constraint

### Pickup Corner
1. Fetch `public/pickups/index.json` for available pickup IDs
2. Load latest pickup JSON
3. Display in talk-show format: master intro → video → reveal → banter
4. Past pickups lazy-loaded on demand

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
- Language toggle UI planned for future

## Table Schema

### posts
| Column | Type | Description |
|---|---|---|
| id | TEXT PK | UUID |
| video_url | TEXT | Original video URL |
| platform | TEXT | youtube / niconico / other |
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
| created_at | TEXT | Created timestamp |

### reactions
| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| post_id | TEXT FK | Post ID |
| reaction_key | TEXT | Emoji character (e.g. "👂", "🤣", "❤️") |
| ip_hash | TEXT | Reactor IP hash |
| created_at | TEXT | Timestamp |

**Constraints:** UNIQUE(post_id, ip_hash) — one reaction per user per post.
