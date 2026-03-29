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

## Playback Architecture

### 概要

3プラットフォームそれぞれ異なる制約があり、共通のアプローチが存在しない。
以下にセッション94で判明した全調査結果を記録する。

### 試行した全アプローチと結果

#### iframe隠蔽方式（pre-mount + 隠す）

| 隠し方 | YouTube | Niconico | SoundCloud |
|---|---|---|---|
| `display:none` (Tailwind `hidden`) | onStateChange等JSコールバック死亡 | postMessageが届かない（プレイヤーJS未初期化?） | 未検証 |
| `clip-path: inset(100%)` | JSコールバック死亡 | 未検証 | 未検証 |
| `visibility: hidden` | JSコールバック死亡（セッション93で確認） | 未検証 | 未検証 |
| `opacity: 0` | 未検証 | 未検証 | 未検証 |

**結論**: iframe を隠すとYouTubeのJSコールバックが壊れる。ニコニコもdisplay:noneでpostMessageに応答しない。

#### 常時描画方式（pre-mount + 隠さない）

- 不透明サムネイルオーバーレイでプレイヤーを覆い、クリックでオーバーレイ除去+play()同期呼び出し
- **YouTube**: 同時プレイヤー制限で3個目以降が壊れる（postMessage origin不一致エラー多発）
- **Niconico**: iframeは見えているがpostMessage playに応答しない

**結論**: 複数YouTubeプレイヤーの同時初期化は不可。ニコニコはpostMessage制御自体が現行embedプレイヤーで動作しない。

#### mount-on-click方式（クリック時にiframe生成）

- クリック→iframe生成→`autoplay`パラメータで再生
- **YouTube**: `autoplay:1`でブラウザのユーザーアクティベーション(5秒)内に再生開始。**動作する**
- **SoundCloud**: `auto_play=true` + Widget API `seekTo(ms)` on READY。**動作する**
- **Niconico**: `autoplay=1&from={sec}`をURL指定。autoplayが効かない。ユーザーがニコニコの純正再生ボタンを押す必要がある。**再生は可能だが自動再生は不可**

### ニコニコ固有の制約

- **postMessage制御が動作しない**: `{ eventName: "play" }` / `{ eventName: "seek" }` をtarget origin `https://embed.nicovideo.jp` に送信しても、現行のニコニコembedプレイヤーが応答しない。エラーも出ない。セッション93時点では動作していたと思われるが、セッション94で全パターンをテストしたところ再現できなかった
- **`autoplay=1` URLパラメータが効かない**: embed URLに指定しても自動再生されない
- **`playerStatusChange` イベントが来ない**: ニコニコembedからの再生状態通知を`window.addEventListener("message")`で受信しようとしたが、イベントが発火しない
- **`from={sec}` パラメータは動作する**: シーク位置の指定は効く
- **ユーザーのネイティブ再生ボタン押下は動作する**: overlayやspinnerで隠さなければ、ユーザーが直接ニコニコの再生ボタンを押して再生できる

### 現在の実装（セッション94時点）

| | YouTube | Niconico | SoundCloud |
|---|---|---|---|
| マウント方式 | mount-on-click | mount-on-click | mount-on-click |
| API先読み | IFrame APIスクリプト(IntersectionObserver) | なし | なし |
| 再生トリガー | `autoplay:1` (playerVars) | `autoplay=1` (URL、効かない) + ネイティブボタン | `auto_play=true` (URL) |
| シーク | `start` playerVar | `from` URLパラメータ | `seekTo(ms)` on READY |
| 時間取得 | `getCurrentTime()` poll (100ms) | `Date.now()` elapsed推定 | `PLAY_PROGRESS` イベント |
| 区間終了 | `pauseVideo()` | タイマー→iframe unmount | `widget.pause()` |
| スピナー | `!hasPlayed`の間表示 | **非表示**（ネイティブボタンを隠さないため） | `!hasPlayed`の間表示 |
| interaction overlay | `hasPlayed`後に表示 | **非表示**（同上） | `hasPlayed`後に表示 |
| 字幕タイマー開始 | `onStateChange(PLAYING)` | iframe `onLoad` | `PLAY` イベント |
| 字幕同期精度 | 高（実再生検出） | 低（onLoad起点、手動再生まで遅延あり） | 高（実再生検出） |

### 未解決: ニコニコの字幕同期

ニコニコでは再生開始を検出する手段がない（postMessage受信不可、playerStatusChange非送信）。
現在のタイマーはiframe onLoadから開始するが、ユーザーがネイティブ再生ボタンを押すまでの
遅延分だけ字幕が先行する。改善案:

1. **タイマー開始をやめ、字幕なしで動画のみ再生** — 機能縮退だが確実
2. **「字幕開始」ボタンを別途表示** — ユーザーが再生ボタンを押した直後にタップ→タイマー開始
3. **ニコニコのみpre-mount+postMessageを再調査** — embed APIの仕様変更を追跡
4. **現状維持（onLoad起点、ズレ許容）** — 最もシンプルだがUXは劣る

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
