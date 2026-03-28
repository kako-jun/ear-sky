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
├── index.css            # Tailwind + neon theme + karaoke sweep animation
├── types/
│   ├── index.ts         # Post, Draft, Pickup, LANGUAGES, CURATED_EMOJI
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
│   ├── PostEditor.tsx   # Post form (preview + drafts + auto-complete + era/comment)
│   ├── PostCard.tsx     # Post card (spoiler/reveal + player + subtitle + reactions)
│   ├── PickupCorner.tsx # Pickup corner (master & regular banter)
│   ├── YouTubePlayer.tsx # YouTube IFrame API segment playback (controls:1, post-play overlay+replay)
│   ├── NiconicoPlayer.tsx # Niconico embed segment playback
│   ├── Subtitle.tsx     # Misheard text subtitle (karaoke sweep + black stroke)
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
└── 0003_emoji_reactions.sql  # emoji reactions + era/comment columns
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
- **Legacy migration**: Old array-based localStorage auto-migrated on load

## Spoiler/Reveal Mechanism

- PostCard hides `misheardText` initially (shows "???")
- Reveal triggers: (1) Video starts playing, or (2) "Show mishearing" button clicked
- Karaoke-style subtitle appears when playback reaches the misheard segment (time-synced via onTimeUpdate), stays visible after sweep (番組風)
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
- Subtitle: Karaoke left→right sweep (white→yellow) + thick black stroke, duration matches segment length
- Icon: Copilot-generated cloud-cat-ear mascot (public/icon-*.png), used in Header and EmptyState
- prefers-reduced-motion supported
- Mobile background: `100lvh` to prevent jitter from address bar toggle

## Cloudflare Config

- D1 database: ear-sky-db (fcbfc739-0198-4d71-a2a7-915411fdb563)
- Nostalgic counter ID: ear-sky-eaae1797
- Custom domain: ear-sky.llll-ll.com
- GitHub integration: auto-deploy on push
