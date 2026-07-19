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
以下にセッション94で判明した調査結果を記録する（ニコニコの postMessage は
2026-07 に jsapi ハンドシェイクで動作すると判明。当時の「効かない」結論は誤りだった）。

### 試行した全アプローチと結果

#### iframe隠蔽方式（pre-mount + 隠す）

| 隠し方 | YouTube | Niconico | SoundCloud |
|---|---|---|---|
| `display:none` (Tailwind `hidden`) | onStateChange等JSコールバック死亡 | postMessageが届かない（プレイヤーJS未初期化?） | 未検証 |
| `clip-path: inset(100%)` | JSコールバック死亡 | 未検証 | 未検証 |
| `visibility: hidden` | JSコールバック死亡（セッション93で確認） | 未検証 | 未検証 |
| `opacity: 0` | 未検証 | 未検証 | 未検証 |

**結論**: iframe を隠すとYouTubeのJSコールバックが壊れる。ニコニコは `display:none` だとプレイヤーJS未初期化で postMessage が届かないため、pre-mount して可視のまま扱う。

#### 常時描画方式（pre-mount + 隠さない）

- 不透明サムネイルオーバーレイでプレイヤーを覆い、クリックでオーバーレイ除去+play()同期呼び出し
- **YouTube**: 同時プレイヤー制限で3個目以降が壊れる（postMessage origin不一致エラー多発）
- **Niconico**: pre-mount + 可視のまま、jsapi ハンドシェイク付き postMessage で `play` を送れば動作する（採用）

**結論**: 複数YouTubeプレイヤーの同時初期化は不可。ニコニコは jsapi ハンドシェイク（`jsapi=1&playerId` + `sourceConnectorType:1`）を付ければ postMessage 制御が動作する。

#### mount-on-click方式（クリック時にiframe生成）

- クリック→iframe生成→`autoplay`パラメータで再生
- **YouTube**: `autoplay:1`でブラウザのユーザーアクティベーション(5秒)内に再生開始。**動作する**
- **SoundCloud**: `auto_play=true` + Widget API `seekTo(ms)` on READY。**動作する**
- **Niconico**: pre-mount + jsapi postMessage(`play`)をクリックハンドラ内で送信。**動作する**（下記）

### ニコニコ固有の制約

- **jsapiハンドシェイクが必須**: embed URLに `jsapi=1&playerId=<id>` を付け、送信する全メッセージに `sourceConnectorType: 1` と同じ `playerId` を含めること。これを欠くと embed は postMessage を**黙って無視**する（エラーも出ない）。この2点を満たせば play / pause / seek と `loadComplete` / `playerStatusChange` / `playerMetadataChange` / `error` イベント受信すべて動作する（2026-07 実ブラウザで検証済み）
- **`playerStatusChange` は来る**: `playerStatus === 2` で再生中。字幕タイマーはここで起動する
- **`playerMetadataChange` で実 currentTime が取れる**: 約100〜270ms間隔でミリ秒精度の currentTime を受信。Date.now() 推定は不要
- **単位の罠**: URL `from` は秒(floor)、`seek` の `data.time` はミリ秒、受信 `currentTime` もミリ秒。アプリ内部は秒で統一し境界で変換する
- **autoplay policy**: `play` 送信は必ずユーザークリックのハンドラ内で行う。送信後3秒以内に `playerStatus=2` が来なければ「再生ボタンを押してください」の小トーストを出す（muted 開始はしない）
- **API は非公式**: 公式ドキュメントなし。将来壊れうるので `playerStatusChange` フォールバックは必須
- **embed失敗時**: `error` イベント時は `https://www.nicovideo.jp/watch/{videoId}?from={startSec-5}` へ逃がす
- **弾幕(コメント)の非表示**: `commentVisibilityChange` イベント送信で制御できる可能性あり（本実装のスコープ外）

### 現在の実装

| | YouTube | Niconico | SoundCloud |
|---|---|---|---|
| マウント方式 | mount-on-click | **pre-mount** (IntersectionObserver) | mount-on-click |
| API先読み | IFrame APIスクリプト(IO 400px) | iframe自体(IO 200px) | なし |
| 再生トリガー | `autoplay:1` (playerVars) | postMessage `play`（クリックハンドラ内） | `auto_play=true` (URL) |
| シーク | `start` playerVar | `from`(初回)+`seek`(ms) | `seekTo(ms)` on READY |
| 時間取得 | `getCurrentTime()` poll (100ms) | `playerMetadataChange`(実ms) | `PLAY_PROGRESS` イベント |
| 区間終了 | `pauseVideo()` | postMessage `pause`（iframe再マウントなし） | `widget.pause()` |
| スピナー | `!hasPlayed`の間表示 | 統一（Playボタンオーバーレイ） | `!hasPlayed`の間表示 |
| interaction overlay | `hasPlayed`後に表示 | ネイティブコントロール使用 | `hasPlayed`後に表示 |
| 字幕タイマー開始 | `onStateChange(PLAYING)` | `playerStatusChange(2)` | `PLAY` イベント |
| 字幕同期精度 | 高（実再生検出） | 高（実 currentTime 受信） | 高（実再生検出） |

### ニコニコの jsapi ハンドシェイク方式

1. **pre-mount**: IntersectionObserverでiframeを先にマウントし、`loadComplete` を先に受ける
2. **URL**: `https://embed.nicovideo.jp/watch/{videoId}?jsapi=1&playerId={id}&from={playStart秒}`。`playerId` はコンポーネントごとに一意（受信メッセージのフィルタに使う）。`allow="autoplay; fullscreen"`
3. **Playボタン**: 全プラットフォーム統一。pre-mount した iframe の上に Play ボタンをオーバーレイし、クリックハンドラ内で `seek`+`play` を送信
4. **再生検出**: `playerStatusChange(playerStatus===2)` 初検出で `onPlaying()`（字幕開始）
5. **時間同期**: `playerMetadataChange.currentTime/1000` を `onTimeUpdate` に渡す
6. **区間終了**: `currentTime/1000 >= endSec+POST_MARGIN` で `pause` 送信→`onSegmentEnd()`。iframe は再マウントしない
7. **error**: `error` イベント受信で `setError(true)`→フォールバックリンク表示

> 旧方式（〜session94）は「穴あきオーバーレイ + window.blur + activeElement 検出 + 1.2s補正 + nicoKey 再マウント」で、postMessage が効かないとの誤結論に基づいていた。真因は URL の jsapi ハンドシェイク欠落。詳細は git 履歴を参照。

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
- Client: single `"ear-sky"` localStorage key stores `{ reactions: { postId: emoji } }` map

## Pickup Corner

- Monthly JSONs in `public/pickups/` (generated locally → git commit → deploy)
- Master (wine icon, blue) introduces songs → video plays → cue reveal triggers banter
- Share URL: `/share/${pick.postId}` (OGP-compatible)
- Cue fallback: synthesizes single cue from `misheardText/startSec/endSec` when `cues` is absent

## PostEditor

- Wizard flow: URL → song info (oEmbed auto-fill) → cues (DualRangeSlider) → about you
- Preview via `PostCard(preview=true)` — no direct player usage
- Delete key: pre-filled from unified storage, type=password
- Cue editing lives in `useCueEditor`; changing cue N's start auto-updates cue N-1's end
- Submit/preview payload construction lives in `usePostPayload`
- Form sections live under `src/components/post-editor/`; `PostEditor.tsx` orchestrates state, drafts, and submission

## Regression Checks

- `npm run test:unit`: Hono API validation, platform/URL/time/cue rejection, curated reaction rejection, tag filtering, Niconico timestamped links
- `npm run check:mobile-overflow`: Playwright 390px smoke test for page-level horizontal overflow
- `npm run check:editor-ui`: Playwright editor workflow at 390px, including labels, draft load, cue add/remove, submit payload, and screenshot capture
- CI also runs `npm audit --audit-level=high`

## i18n

- English default, Japanese translation
- `useI18n()` hook, locale toggle in header (Globe icon, EN↔JA, persisted via unified storage)
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
- Reaction dedup: server UNIQUE constraint + client unified storage (`"ear-sky"` key)

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
