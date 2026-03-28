# Ear in the Sky Diamond — イヤスカ

あの歌、こう聴こえない？ 世界中の空耳を投稿・再生・共有するサイト。

https://ear-sky.llll-ll.com

## 特徴

- **空耳投稿**: YouTube/ニコニコ動画/その他のURLと、区間（開始〜終了）、「こう聴こえる」テキストを投稿
- **区間再生 + テロップ**: 指定した部分だけが再生され、空耳テキストが番組風に字幕表示（backdrop-blur付き）
- **多言語対応**: 英→日、日→英、英→英、任意の言語ペア
- **ランキング**: 月別ランキングと殿堂入り
- **リアクション**: いいね + 6種のアイコンリアクション（ポジティブのみ）
- **下書き保存**: ローカルに途中保存、後から再開
- **匿名投稿**: ユーザー登録なし、個人情報なし
- **PWA対応**: ホーム画面に追加可能
- **自動補完**: 動画タイトルからアーティスト・曲名を自動取得、ニックネーム記憶
- **モバイルファースト**: スマホで快適に使える

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Vite + React 19 + TypeScript + Tailwind CSS v4 |
| バックエンド | Hono (Cloudflare Pages Functions) |
| データベース | Cloudflare D1 (SQLite) |
| ホスティング | Cloudflare Pages |
| アイコン | Lucide React |
| カウンター | Nostalgic Counter |

## 開発

```bash
npm install
npm run dev     # Vite dev server
npm run build   # Production build
```

## デプロイ

```bash
npx wrangler pages deploy dist --project-name ear-sky
```

D1マイグレーション:
```bash
npx wrangler d1 migrations apply ear-sky-db --remote
```

## 著作権への配慮

当サイトは音声・映像コンテンツを一切ホスティングしていません。YouTube/ニコニコ動画等の公式埋め込みプレーヤーを利用し、再生は各プラットフォーム側で行われます。動画が権利者により削除された場合、該当投稿も自動的に再生不可になります。

## ライセンス

MIT
