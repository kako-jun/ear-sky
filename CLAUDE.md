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
├── App.tsx              # Main SPA (tabs: New/Hall of Fame/Search/Post). 447 lines after refactoring
├── main.tsx             # Entry point + SW registration + localStorage migration
├── index.css            # Tailwind + neon theme + sticky-header override
├── types/
│   ├── index.ts         # Post, SubtitleCue, Draft, Pickup, LANGUAGES, CURATED_EMOJI, PAGE_SIZE
│   └── youtube.d.ts     # YouTube IFrame API type definitions
├── i18n/
│   ├── en.ts            # English strings (default)
│   ├── ja.ts            # Japanese strings
│   └── index.ts         # useI18n() hook, locale detection, dynamic toggle
├── lib/
│   ├── api.ts           # D1 API client (fetch wrapper, throws ApiError on failure)
│   ├── storage.ts       # localStorage (drafts + reaction tracking)
│   ├── video.ts         # URL parsing (YouTube /live/, ?list=&v=, ?t=, ?start=; Niconico nicovideo.jp + nico.ms short URL, ?from=; SoundCloud), time formatting
│   └── oembed.ts        # Video title auto-fetch (oEmbed/noembed)
├── components/
│   ├── Header.tsx       # Neon title + sticky shrink (useShrunk hook: scrollY>80px → compact mode, 200ms lock to prevent oscillation)
│   ├── PostEditor.tsx   # Post form (wizard: URL→preview→info→cues→about you). Preview uses PostCard(preview=true)
│   ├── PostCard.tsx     # Flat post layout (song→artist(era) lang→video→reveal→ID|date|poster). PlatformIcon + external link
│   ├── EmptyState.tsx   # No-posts state with soramimi explanation and CTA
│   ├── ShareButton.tsx  # Share button (Web Share / clipboard)
│   ├── Paginator.tsx    # Range-button pagination (±1 + first/last, PAGE_SIZE=10)
│   ├── RankingList.tsx  # Hall of Fame ranked post list with top emoji
│   ├── Footer.tsx       # Site info, QR code, author links, sponsor, nostalgic-counter
│   ├── PickupCorner.tsx # Pickup corner (master & regular banter)
│   ├── VideoSegment.tsx # Shared video+subtitle component (PostCard/PickupCorner共通)
│   ├── YouTubePlayer.tsx # YouTube IFrame API segment playback. 統合オーバーレイ
│   ├── NiconicoPlayer.tsx # Niconico embed segment playback. 統合オーバーレイ
│   ├── SoundCloudPlayer.tsx # SoundCloud Widget API segment playback. 統合オーバーレイ
│   ├── PlatformIcon.tsx # Platform SVG icons (YouTube/Niconico/SoundCloud)
│   ├── Subtitle.tsx     # Karaoke subtitle (currentTime→progress直接計算, 複数cue対応). useEffect is always called (early return moved after hooks to prevent React Error #310)
│   ├── DualRangeSlider.tsx # Dual-thumb range slider (◀▶ 1s adjust, drag→seekTo連動)
│   ├── NightBackground.tsx # Day-rotating night scene background
│   ├── Reactions.tsx    # Emoji picker + reaction badges (Slack-style, 12 emoji, 1 per user)
│   └── Toast.tsx        # Notification toast (auto-dismiss 3s, stable onClose ref)
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
├── 0004_cues.sql        # cues table (multiple subtitle cues per post)
├── 0005_play_count.sql  # play_count column on posts
├── 0006_tags.sql        # post_tags table (genre/source tags, max 3 per post)
└── 0007_cascade_delete.sql  # ON DELETE CASCADE for reactions + post_tags
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/posts | List posts (?sort=new\|likes&month=YYYY-MM&q=&sourceLang=&targetLang=&tags=anime,game&limit&offset) |
| GET | /api/posts/:id | Get single post |
| POST | /api/posts | Create post (rate limit: 30s/1 per IP) |
| DELETE | /api/posts/:id | Delete post (deleteKey required) |
| PUT | /api/posts/:id/reaction | Set/switch emoji reaction (1 per user per post) |
| DELETE | /api/posts/:id/reaction | Remove your reaction |
| POST | /api/posts/:id/play | Increment play count (fire-and-forget, no dedup) |
| GET | /share/:id | Dynamic OGP (meta tags for bots, redirect for browsers). Title: `{artist}「{song}」の空耳`（ネタバレ防止: 曲名のみ）. Description: 固定テンプレ「この部分、こう聴こえない？ 再生して確かめよう」. Image: YouTube→hqdefaultサムネイル、ニコニコ→cdn.nimg.jpサムネイル、SoundCloud→icon-512.pngフォールバック. twitter:card: YouTube/ニコニコはsummary_large_image、SoundCloudはsummary |

## Reaction System

- **Emoji picker**: 12 curated emoji, user picks ONE per post
- **Default reaction**: 投稿作成時にAPIがバッチ内で🎵を自動シード（投稿者のipHash）。Reddit式の初期スコア
- **Server**: `UNIQUE(post_id, ip_hash)` constraint — one reaction per user per post
- **Switching**: PUT with new emoji replaces the old one
- **Removal**: DELETE removes the reaction entirely
- **Client tracking**: localStorage stores `{ postId: emoji }` map
- **No legacy code**: Migration helpers (migrateReactionsStorage etc.) have been removed

## Play Count

- **DB**: `play_count INTEGER NOT NULL DEFAULT 0` on posts table (0005_play_count.sql)
- **API**: `POST /api/posts/:id/play` increments play_count by 1. No authentication, no dedup — 1 user can count multiple times
- **Frontend**: VideoSegment's `onPlay` callback fires every time playback enters "playing" state (YouTube state===1, Niconico/SoundCloud "playing"). This includes initial play, pause→resume, and replay. PostCard and PickupCorner both call `recordPlay(postId)` via fire-and-forget fetch (`.catch(() => {})`)
- **PickupCorner**: `recordPlay` is called with `pick.postId` when available (`postId` is optional in PickupEntry; guarded by `if (pick.postId)`)
- **Preview mode**: `preview=true` skips the recordPlay call
- **Display**: PostCard meta row, right-aligned with `ml-auto`, Headphones icon (lucide-react) + count. Hidden when playCount is 0
- **Omit type**: `playCount` is omitted from PostData, Draft, createPost, saveDraft (server-managed field)

## Subtitle System (cues)

- **Multiple cues per post**: Each post has N subtitle cues stored in `cues` table (0004_cues.sql)
- **Type**: `SubtitleCue { text, originalText?, showAt, duration }` — `Post.cues: SubtitleCue[]`
- **No CSS animation**: Progress computed directly from `currentTime - cue.showAt` / `cue.duration`; `background-position` set via inline style
- **Backdrop fade-in**: LEAD_SEC (1.5s) before the first cue, the backdrop bar fades in via an opacity ramp (0→1). `backgroundColor` is set as inline style `rgba(0,0,0, 0.5 * backdropOpacity)` — no Tailwind class, no pop-in
- **Subtitle.tsx**: Receives `cues[]` + `currentTime`, finds active cue, calculates progress 0→1, renders karaoke sweep (transparent→white, fill layer uses background-clip:text, no textShadow). スイープ境界は2%幅グラデーション帯（49%-51%, rgba(255,255,255,0.5)）でハードカットではなく滑らかに遷移。After sweep completes, text remains visible (bar-style residual). Subtitle persists after playback ends. Text opacity also follows backdropOpacity during the lead-in period
- **VideoSegment.tsx**: Shared component wrapping video player + Subtitle, used by both PostCard and PickupCorner. `onCueReached` fires after the last cue finishes (not after the first)
- **Multiple cue reveal display**: PostCard shows each cue's text as a separate block when `cues.length > 1` (individual `<div>` per cue with text + originalText). Single cue uses the legacy `misheardText` field
- **Cue editing chaining**: Editing a subsequent cue's startSec auto-updates the previous cue's endSec. Forward chaining ensures subsequent cue starts match the prior cue's end, with minimum 3s duration enforcement
- **Frontend cue limit**: Max 3 cues per post (PostEditor enforces)

## Spoiler/Reveal Mechanism

- PostCard hides cue texts initially (shows hint text via `revealHint` i18n key)
- Reveal trigger: Playback reaches the end of the **last** cue (onCueReached fires when `currentTime >= lastCue.showAt + lastCue.duration`). No manual reveal button — reveal is playback-only
- In preview mode (`preview=true`), revealed is initially true (no spoiler gate)
- Karaoke-style subtitle appears when playback reaches each cue's showAt (time-synced via currentTime), stays visible after sweep (番組風)
- Playback has pre-margin (5s) and post-margin (0.3s) around the segment (POST_MARGIN=0.3s, all players)
- After playback ends, swept subtitle text remains visible (not cleared)
- **統合オーバーレイ（3プレイヤー共通）**: 1つのdivが再生中ブロック＋リプレイを兼ねる。条件 `(playing || segmentEnded)` で表示。再生中は透明でiframe操作遮断（onClick=undefined）、segmentEnded時はbg-black/30+RotateCcw+role="button"+aria-label。再生前（両方false）はオーバーレイ非表示
- **Pre-mount hiding**: VideoSegmentは未展開時のiframeを `clip-path: inset(100%) + position: absolute + pointer-events: none` で隠す。`display: none`（Tailwind `hidden`）はiframe初期化を阻害するため使用禁止。YouTube APIはコンテナ高さ0で初期化不能なので `height: 0` も不可
- YouTube: handlePlayでリプレイ。No `end` playerVar (prevents seek-to-start on replay)
- Niconico: handlePlayでリプレイ。pause postMessage sent at segment end
- SoundCloud: handleReplayでリプレイ。Widget API seek/pause for segment playback
- `animate-fade-in` CSS animation on reveal

## Pickup Corner

- **Data**: `public/pickups/` monthly JSONs. Generated locally → git commit → deploy. Pick count varies per month (e.g. 2026-03 has 2 picks)
- **Format**: Master (wine/blue) introduces song (1曲目「まずは」, 2曲目以降「続いては」) → サムネイルクリックで展開（autoExpand廃止） → cue区間到達で空耳テキスト+掛け合い自動展開。専用revealボタンなし
- **Layout**: 通常の投稿カードと同じ見た目（VideoSegment共通コンポーネント使用）
- **Archive**: "Past picks" expandable below the latest
- **JSON**: `{ id, title, publishedAt, picks: [{ artistName, songTitle, year, videoUrl, startSec, endSec, misheardText, originalText?, cues?: SubtitleCue[], banter: [{speaker, text}] }] }`
- **Cue fallback**: `PickupEntry.cues` is optional. When `cues` is undefined or empty, PickupCorner synthesizes a single cue from `misheardText`/`startSec`/`endSec`. Existing pickup JSONs without `cues` work unchanged
- **Multi-cue reveal**: When `pickupCues.length > 1`, each cue is displayed as a separate block (same pattern as PostCard). Single cue uses legacy `misheardText` display
- **シェアURL**: PickupItemのシェアボタンは `/share/${pick.postId}` を生成（OGP対応）。旧アンカー方式（`#pickup-{id}-{index}`）は廃止。`postId` がない場合はシェアボタン無効（早期return）
- **URL入力欄**: URL未入力時にYouTube/niconico/SoundCloudへのExternalLinkアイコン付きリンクを表示
- **startSec自動取得**: parseVideoUrlの戻り値に `startSec?: number` を追加。URL中の `?t=` / `&t=` / `?start=` (YouTube) / `?from=` (niconico, nicovideo.jp/nico.ms両対応) から開始時刻を取得し、PostEditorで字幕cue初期値に反映

## PostEditor Architecture

- **No direct player usage**: PostEditor does NOT use YouTubePlayer/NiconicoPlayer/SoundCloudPlayer/Subtitle directly. Instead, it renders PostCard with `preview=true` for real-time preview below the URL input
- **No ytRef**: YouTubePlayerHandle (ytRef) is removed from PostEditor. getDuration/seekTo are not available through PostCard
- **videoDuration fixed**: Since duration cannot be queried via PostCard, videoDuration defaults to 300 (5 minutes)
- **PostCard preview mode**: When `preview=true`, PostCard shows skeleton placeholders (animate-pulse) for ID and date fields, and hides the reaction UI entirely
- **ClearableInput**: All text inputs have a clear (×) button on the right edge (right-3, pr-10 — left paddingと対称), visible only when the field has a value
- **Section naming**: 「あなたについて/About you」→「投稿者名・削除キー/Nickname & delete key」
- **deleteKey**: localStorageから復元（初期値）、投稿成功時に保存。type=password, autoComplete=off
- **Cue hint**: A single note is displayed once below the subtitle section header (not per cue), explaining that the time range is for the misheard part and playback starts 5 sec before automatically
- **Cue editing**: First cue uses DualRangeSlider for start+end. Subsequent cues (2nd, 3rd) also have editable start via DualRangeSlider; changing start auto-updates the previous cue's end to match
- **Draft list UX**: Hover effect (`hover:text-white hover:bg-white/5`) + underline (`underline underline-offset-2 decoration-white/20`) on draft items for clickable affordance

## i18n

- English is the default language, Japanese is one of many translations
- `src/i18n/en.ts` defines the `Messages` type, `ja.ts` implements it
- `useI18n()` hook returns messages based on `navigator.language`
- alias/closingからダッシュ文字(—)を除去済み。footer.siteAlias追加
- **ダッシュ装飾**: テキストの「—」→CSSグラデーション線（from-white/30 to-transparent, w-10〜w-12）。Header alias, PickupCorner closing, Footer siteAlias の3箇所
- **Language toggle**: Header right, Globe icon, EN↔JA cycle, localStorage persisted

## Post Deletion (Frontend)

- **UI flow**: PostCard has a small Trash2 icon (white/35, bottom-right). Click → delete key input field appears (type=password) → submit → `deletePost(id, key)` API call → on success, `onDeleted?.(id)` callback removes card from feed
- **localStorage pre-fill**: Delete key input initializes from `localStorage.getItem("ear-sky-delete-key")` (saved by PostEditor on successful post). Shared across all PostCards. Wrong key for another user's post is rejected server-side (ApiError)
- **Error state**: `deleteError` turns input border red + "Wrong key" text shown. Input and cancel disabled during deletion. User can retry or close (✕ button)
- **preview=false only**: Entire delete UI is gated by `!preview`
- **Feed tab**: `onDeleted` callback filters the post out of `feedPosts` state immediately
- **Hall of Fame tab**: `onDeleted` is not passed. Deletion succeeds on API but card remains in UI until reload. `deleting` state stays true (button shows "...") — user can close the form via ✕

## Security

- **Input validation**: Type/length/enum checks on all fields. URL protocol check (https/http only)
- **Rate limiting**: IP hash-based, 30s cooldown between posts
- **XSS prevention**: URL protocol check before href insertion. OGP escapeHtml. OGP画像URLにキャッシュバスティング(?v=2)追加（静的index.html・動的share/[id].ts両方）
- **CORS**: Production domains only
- **Reaction dedup**: Server-side UNIQUE constraint + client-side localStorage
- **Post deletion**: Delete key verification
- **Dynamic OGP**: UUID validation, HTML escaping, videoId encodeURIComponent

## Design Theme

- Background: Night bar street gradient (night-deep → bar-wall → bar-counter)
- Day-rotating background images (7 Gemini-generated night scenes, webp)
- Accents: Neon Pink (#ff2d78), Neon Blue (#00d4ff), Neon Yellow (#ffe156)
- Text: white/30+ (decorative) to white/50+ (interactive/readable), WCAG AA improved
- Subtitle: Karaoke left→right sweep (transparent→white), progress driven by currentTime (no CSS animation)
- Icon: Copilot-generated cloud-cat-ear mascot (public/icon-*.png), used in Header and EmptyState. Top-level OGP uses icon-512.png with twitter:card=summary. Per-post OGP uses platform thumbnails where available
- prefers-reduced-motion supported
- Mobile background: `100lvh` to prevent jitter from address bar toggle

## Service Worker

- `public/sw.js`: Stale-while-revalidate caching for static assets
- **Same-origin only**: Third-party requests (Cloudflare analytics, YouTube API, SoundCloud CDN) are skipped via `url.origin !== self.location.origin` check. Without this, the SW attempts to cache cross-origin responses and fails with "Failed to convert value to 'Response'"
- API calls (`/api/`) are network-only (no caching)
- Cache name includes build date for automatic invalidation on deploy

## Cloudflare Config

- D1 database: ear-sky-db (fcbfc739-0198-4d71-a2a7-915411fdb563)
- Nostalgic counter ID: ear-sky-eaae1797
- Custom domain: ear-sky.llll-ll.com
- GitHub integration: auto-deploy on push
