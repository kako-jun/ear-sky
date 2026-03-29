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
│   ├── video.ts         # URL parsing (YouTube /live/, ?list=&v=, ?t=, ?start=; Niconico ?from=; SoundCloud), time formatting
│   └── oembed.ts        # Video title auto-fetch (oEmbed/noembed)
├── components/
│   ├── Header.tsx       # Neon title
│   ├── PostEditor.tsx   # Post form (wizard: URL→preview→info→cues→about you). Preview uses PostCard(preview=true), not direct player components
│   ├── PostCard.tsx     # Flat post layout (song→artist(era) lang→video→reveal→ID|date|poster). Song title is external link to source platform with PlatformIcon. preview prop: preview=true shows skeleton ID/date (animate-pulse) and hides reactions
│   ├── PickupCorner.tsx # Pickup corner (master & regular banter)
│   ├── VideoSegment.tsx # Shared video+subtitle component (PostCard/PickupCorner共通)
│   ├── YouTubePlayer.tsx # YouTube IFrame API segment playback (controls:1, width/height 100%, post-play overlay+replay, no `end` playerVar)
│   ├── NiconicoPlayer.tsx # Niconico embed segment playback
│   ├── SoundCloudPlayer.tsx # SoundCloud Widget API segment playback
│   ├── PlatformIcon.tsx # Platform SVG icons (YouTube/Niconico/SoundCloud)
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
- **Subtitle.tsx**: Receives `cues[]` + `currentTime`, finds active cue, calculates progress 0→1, renders karaoke sweep (transparent→white, fill layer uses background-clip:text, no textShadow). After sweep completes, text remains visible (bar-style residual). Subtitle persists after playback ends
- **VideoSegment.tsx**: Shared component wrapping video player + Subtitle, used by both PostCard and PickupCorner
- **Frontend cue limit**: Max 3 cues per post (PostEditor enforces)

## Spoiler/Reveal Mechanism

- PostCard hides cue texts initially (shows hint text via `revealHint` i18n key)
- Reveal trigger: Playback reaches a cue region (onCueReached). No manual reveal button — reveal is playback-only
- In preview mode (`preview=true`), revealed is initially true (no spoiler gate)
- Karaoke-style subtitle appears when playback reaches each cue's showAt (time-synced via currentTime), stays visible after sweep (番組風)
- Playback has pre-margin (5s) and post-margin (0.3s) around the segment (POST_MARGIN=0.3s, all players)
- After playback ends, swept subtitle text remains visible (not cleared)
- YouTube: segment end triggers replay overlay (RotateCcw, bg-black/30); user pause does not. No `end` playerVar (prevents seek-to-start on replay)
- Niconico: pause postMessage sent at segment end; replay overlay same as YouTube
- SoundCloud: Widget API seek/pause for segment playback; replay overlay same as YouTube
- `animate-fade-in` CSS animation on reveal

## Pickup Corner

- **Data**: `public/pickups/` monthly JSONs. Generated locally → git commit → deploy
- **Format**: Master (wine/blue) introduces song (1曲目「まずは」, 2曲目以降「続いては」) → video plays → cue区間到達で空耳テキスト+掛け合い自動展開。専用revealボタンなし
- **Layout**: 通常の投稿カードと同じ見た目（VideoSegment共通コンポーネント使用）
- **Archive**: "Past picks" expandable below the latest
- **JSON**: `{ id, title, publishedAt, picks: [{ artistName, songTitle, year, videoUrl, startSec, endSec, misheardText, originalText?, banter: [{speaker, text}] }] }`
- **URL入力欄**: URL未入力時にYouTube/niconico/SoundCloudへのExternalLinkアイコン付きリンクを表示
- **startSec自動取得**: parseVideoUrlの戻り値に `startSec?: number` を追加。URL中の `?t=` / `&t=` / `?start=` (YouTube) / `?from=` (niconico) から開始時刻を取得し、PostEditorで字幕cue初期値に反映

## PostEditor Architecture

- **No direct player usage**: PostEditor does NOT use YouTubePlayer/NiconicoPlayer/SoundCloudPlayer/Subtitle directly. Instead, it renders PostCard with `preview=true` for real-time preview below the URL input
- **No ytRef**: YouTubePlayerHandle (ytRef) is removed from PostEditor. getDuration/seekTo are not available through PostCard
- **videoDuration fixed**: Since duration cannot be queried via PostCard, videoDuration defaults to 300 (5 minutes)
- **PostCard preview mode**: When `preview=true`, PostCard shows skeleton placeholders (animate-pulse) for ID and date fields, and hides the reaction UI entirely
- **ClearableInput**: All text inputs have a clear (×) button on the right edge, visible only when the field has a value
- **Cue hint**: A single note is displayed once below the subtitle section header (not per cue), explaining that the time range is for the misheard part and playback starts 5 sec before automatically

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
- Subtitle: Karaoke left→right sweep (transparent→white), progress driven by currentTime (no CSS animation)
- Icon: Copilot-generated cloud-cat-ear mascot (public/icon-*.png), used in Header and EmptyState. OGP image includes icon
- prefers-reduced-motion supported
- Mobile background: `100lvh` to prevent jitter from address bar toggle

## Cloudflare Config

- D1 database: ear-sky-db (fcbfc739-0198-4d71-a2a7-915411fdb563)
- Nostalgic counter ID: ear-sky-eaae1797
- Custom domain: ear-sky.llll-ll.com
- GitHub integration: auto-deploy on push
