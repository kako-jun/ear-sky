# Ear in the Sky Diamond — 開発ガイド

## 設計思想

- **コンテンツ非ホスティング**: 動画・音声は外部プラットフォームの埋め込みのみ。著作権リスクを回避
- **匿名・軽量**: ユーザー登録なし、個人情報なし。投稿はURLとテキストだけ
- **深夜番組トーン**: ネオン看板の夜の飲み屋街。おしゃれすぎない、庶民的
- **モバイルファースト**: タップターゲット44px基準、スマホで全操作可能

## プロジェクト構成

```
src/
├── App.tsx              # メインSPA（タブ切替: 新着/ランキング/殿堂/投稿）
├── main.tsx             # エントリポイント + SW登録
├── index.css            # Tailwind + ネオンテーマ
├── types/
│   ├── index.ts         # Post, Draft, LANGUAGES, REACTION_KEYS
│   └── youtube.d.ts     # YouTube IFrame API型定義
├── lib/
│   ├── api.ts           # D1 APIクライアント (fetch wrapper)
│   ├── storage.ts       # localStorage (下書き + リアクション追跡)
│   ├── video.ts         # URL解析, 時間フォーマット
│   └── oembed.ts        # 動画タイトル自動取得 (oEmbed/noembed)
├── components/
│   ├── Header.tsx       # ネオンタイトル
│   ├── PostEditor.tsx   # 投稿フォーム（プレビュー+下書き+自動補完）
│   ├── PostCard.tsx     # 投稿カード（再生+テロップ+リアクション）
│   ├── YouTubePlayer.tsx # YouTube IFrame API区間再生
│   ├── Subtitle.tsx     # 空耳テロップ（backdrop-blur）
│   ├── Reactions.tsx    # いいね + 6種リアクション（Lucideアイコン）
│   ├── CloudEarIcon.tsx # 雲猫耳+ヘッドフォン マスコットSVG
│   └── Toast.tsx        # 通知トースト
functions/
└── api/
    └── [[route]].ts     # Hono APIルート (Pages Functions)
migrations/
├── 0001_init.sql        # posts + reactions テーブル
└── 0002_security.sql    # ip_hash, delete_key カラム追加
```

## API エンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| GET | /api/posts | 一覧取得 (?sort=new\|likes&month=YYYY-MM) |
| GET | /api/posts/:id | 個別取得 |
| POST | /api/posts | 投稿作成（レートリミット: 30秒/1件） |
| DELETE | /api/posts/:id | 削除（deleteKey必須） |
| POST | /api/posts/:id/like | いいね（IP重複防止） |
| POST | /api/posts/:id/react | リアクション（key検証+IP重複防止） |

## セキュリティ

- **入力バリデーション**: 全フィールドに型・長さ・enum検証。URLはhttps/httpのみ
- **レートリミット**: IP hashベースで投稿30秒制限
- **XSS防止**: other platformのURLをhref挿入前にプロトコルチェック
- **CORS**: 本番ドメインのみ許可
- **いいね/リアクション重複防止**: サーバー側IP hash + クライアント側localStorage
- **投稿削除**: 削除キーによる本人確認

## デザインテーマ

- 背景: 夜の飲み屋街グラデーション (night-deep → bar-wall → bar-counter)
- アクセント: ネオンピンク (#ff2d78), ネオンブルー (#00d4ff)
- テキスト: white/60 以上（AA コントラスト確保）
- prefers-reduced-motion 対応済み

## Cloudflare設定

- D1 database: ear-sky-db (fcbfc739-0198-4d71-a2a7-915411fdb563)
- Nostalgic counter ID: ear-sky-eaae1797
- カスタムドメイン: ear-sky.llll-ll.com
