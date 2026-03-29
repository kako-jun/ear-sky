# Ear in the Sky Diamond — Development Guide

## Design Philosophy

- **No content hosting**: Videos/audio via external platform embeds only. Copyright-safe
- **Anonymous & lightweight**: No user registration, no personal info. Posts are just URLs and text
- **Late-night TV tone**: Neon signs, night bar street. Not too polished, approachable
- **Mobile-first**: 44px tap targets, all operations possible on phones
- **English as default**: i18n with English base, Japanese as one of many translations

## Project Structure

```
src/
├── App.tsx              # Main SPA (tabs: New/Hall of Fame/Post)
├── main.tsx             # Entry point + SW registration + localStorage migration
├── index.css            # Tailwind + neon theme
├── types/
│   ├── index.ts         # Post, SubtitleCue, Draft, Pickup, LANGUAGES, CURATED_EMOJI
│   └── youtube.d.ts     # YouTube IFrame API type definitions
├── i18n/
│   ├── en.ts            # English strings (default)
│   ├── ja.ts            # Japanese strings
│   └── index.ts         # useI18n() hook, locale detection
├── lib/
│   ├── api.ts           # D1 API client (fetch wrapper)
│   ├── storage.ts       # localStorage (drafts + reaction tracking)
│   ├── video.ts         # URL parsing, time formatting
│   └── oembed.ts        # Video title auto-fetch (oEmbed/noembed)
├── components/
│   ├── Header.tsx       # Neon title
│   ├── PostEditor.tsx   # Post form (wizard: URL→preview→info→cues→about you)
│   ├── PostCard.tsx     # Flat post layout (song→artist(era) lang→video→reveal→ID|date|poster)
│   ├── PickupCorner.tsx # Pickup corner (master & regular banter)
│   ├── VideoSegment.tsx # Shared video+subtitle component (PostCard/PickupCorner共通)
│   ├── YouTubePlayer.tsx # YouTube IFrame API segment playback (controls:1, width/height 100%, post-play overlay+replay)
│   ├── NiconicoPlayer.tsx # Niconico embed segment playback
│   ├── Subtitle.tsx     # Karaoke subtitle (currentTime→progress直接計算, 複数cue対応)
│   ├── DualRangeSlider.tsx # Dual-thumb range slider (◀▶ 1s adjust, drag→seekTo連動)
│   ├── NightBackground.tsx # Day-rotating night scene background
│   ├── Reactions.tsx    # Emoji picker + reaction badges (Slack-style, 1 per user)
│   └── Toast.tsx        # Notification toast
functions/
├── api/
│   └── [[route]].ts     # Hono API routes (Pages Functions)
└── share/
    └── [id].ts          # Dynamic OGP (bot meta tags + user redirect)
public/
├── pickups/             # Pickup JSONs (local generation → commit)
│   ├── index.json       # Available pickup ID list
│   └── {YYYY-MM}.json   # Monthly pickup data
├── bg/                  # Night scene backgrounds (bg-0~6.webp, day rotation)
migrations/
├── 0001_init.sql        # posts + reactions tables
├── 0002_security.sql    # ip_hash, delete_key columns
├── 0003_emoji_reactions.sql  # emoji reactions + era/comment columns
└── 0004_cues.sql        # cues table (multiple subtitle cues per post)
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/posts | List posts (?sort=new\|likes&month=YYYY-MM&limit&offset) |
| GET | /api/posts/:id | Get single post |
| POST | /api/posts | Create post (rate limit: 30s/1 per IP) |
| DELETE | /api/posts/:id | Delete post (deleteKey required) |
| PUT | /api/posts/:id/reaction | Set/switch emoji reaction (1 per user per post) |
| DELETE | /api/posts/:id/reaction | Remove your reaction |
| GET | /share/:id | Dynamic OGP (meta tags for bots, redirect for browsers) |

## Reaction System

- **Emoji picker**: 16 curated emoji, user picks ONE per post
- **Server**: `UNIQUE(post_id, ip_hash)` constraint — one reaction per user per post
- **Switching**: PUT with new emoji replaces the old one
- **Removal**: DELETE removes the reaction entirely
- **Client tracking**: localStorage stores `{ postId: emoji }` map
- **No legacy code**: Migration helpers (migrateReactionsStorage etc.) have been removed

## Subtitle System (cues)

- **Multiple cues per post**: Each post has N subtitle cues stored in `cues` table (0004_cues.sql)
- **Type**: `SubtitleCue { text, originalText?, showAt, duration }` — `Post.cues: SubtitleCue[]`
- **No CSS animation**: Progress computed directly from `currentTime - cue.showAt` / `cue.duration`; `background-position` set via inline style
- **Subtitle.tsx**: Receives `cues[]` + `currentTime`, finds active cue, calculates progress 0→1, renders karaoke sweep. After sweep completes, text remains visible (bar-style residual)
- **VideoSegment.tsx**: Shared component wrapping video player + Subtitle, used by both PostCard and PickupCorner

## Spoiler/Reveal Mechanism

- PostCard hides cue texts initially (shows "???")
- Reveal triggers: (1) Video starts playing (onCueReached), or (2) "Show mishearing" button clicked
- Karaoke-style subtitle appears when playback reaches each cue's showAt (time-synced via currentTime), stays visible after sweep (番組風)
- Playback has pre-margin (5s) and post-margin (1s) around the segment
- YouTube: segment end triggers replay overlay (RotateCcw); user pause does not
- Niconico: pause postMessage sent at segment end; replay overlay same as YouTube
- `animate-fade-in` CSS animation on reveal

## Pickup Corner

- **Data**: `public/pickups/` monthly JSONs. Generated locally → git commit → deploy
- **Format**: Master (wine/blue) introduces song → video plays → "Show mishearing" reveal → master & regular (beer mug/yellow) banter
- **Archive**: "Past picks" expandable below the latest
- **JSON**: `{ id, title, publishedAt, picks: [{ artistName, songTitle, year, videoUrl, startSec, endSec, misheardText, originalText?, banter: [{speaker, text}] }] }`

## i18n

- English is the default language, Japanese is one of many translations
- `src/i18n/en.ts` defines the `Messages` type, `ja.ts` implements it
- `useI18n()` hook returns messages based on `navigator.language`
- Language toggle UI planned for future

## Security

- **Input validation**: Type/length/enum checks on all fields. URL protocol check (https/http only)
- **Rate limiting**: IP hash-based, 30s cooldown between posts
- **XSS prevention**: URL protocol check before href insertion. OGP escapeHtml
- **CORS**: Production domains only
- **Reaction dedup**: Server-side UNIQUE constraint + client-side localStorage
- **Post deletion**: Delete key verification
- **Dynamic OGP**: UUID validation, HTML escaping

## Design Theme

- Background: Night bar street gradient (night-deep → bar-wall → bar-counter)
- Day-rotating background images (7 Gemini-generated night scenes, webp)
- Accents: Neon Pink (#ff2d78), Neon Blue (#00d4ff), Neon Yellow (#ffe156)
- Text: white/60+ (AA contrast)
- Subtitle: Karaoke left→right sweep (white→yellow) + 2px black stroke, progress driven by currentTime (no CSS animation)
- Icon: Copilot-generated cloud-cat-ear mascot (public/icon-*.png), used in Header and EmptyState
- prefers-reduced-motion supported
- Mobile background: `100lvh` to prevent jitter from address bar toggle

## Cloudflare Config

- D1 database: ear-sky-db (fcbfc739-0198-4d71-a2a7-915411fdb563)
- Nostalgic counter ID: ear-sky-eaae1797
- Custom domain: ear-sky.llll-ll.com
- GitHub integration: auto-deploy on push
