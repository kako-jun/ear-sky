# アーキテクチャ

## 全体構成

```
[ブラウザ] → [CF Pages (静的SPA)] → [Pages Functions (Hono API)] → [D1 (SQLite)]
                                   ↕
                          [YouTube/ニコニコ 埋め込み]
                          [Nostalgic Counter API]
                          [noembed.com (oEmbed proxy)]
```

## データフロー

### 投稿
1. ユーザーがURL+区間+空耳テキストを入力
2. URLからplatform/videoIdを解析 (`video.ts`)
3. oEmbed経由で動画タイトルを自動取得 → アーティスト・曲名に分割
4. プレビューで確認（YouTube区間再生+テロップ）
5. POST /api/posts → D1に保存（IPハッシュ付き）
6. フィードに即反映

### 再生
1. PostCardの再生ボタンをタップ
2. YouTube IFrame APIでプレーヤーを初期化（start/end指定）
3. 「この部分を再生」で区間の先頭にseek+play
4. 再生開始0.5秒後にSubtitleコンポーネントがフェードイン（backdrop-blur付き）
5. 終了秒に達したら自動停止

### リアクション
1. いいね/リアクションボタンをタップ
2. localStorage で重複チェック（クライアント側UI即時反映）
3. API呼び出し（サーバー側IPハッシュで重複防止）
4. カウント更新

## テーブル設計

### posts
| カラム | 型 | 説明 |
|---|---|---|
| id | TEXT PK | UUID |
| video_url | TEXT | 元の動画URL |
| platform | TEXT | youtube / niconico / other |
| video_id | TEXT | プラットフォーム別ID |
| start_sec | REAL | 開始秒 |
| end_sec | REAL | 終了秒 |
| misheard_text | TEXT | 空耳テキスト |
| original_text | TEXT? | 元の歌詞 |
| artist_name | TEXT | アーティスト名 |
| song_title | TEXT | 曲名 |
| source_lang | TEXT | オリジナル言語 |
| target_lang | TEXT | 聴こえる言語 |
| nickname | TEXT | 投稿者名 |
| likes | INTEGER | いいね数 |
| ip_hash | TEXT | 投稿者IPハッシュ |
| delete_key | TEXT? | 削除キー |
| created_at | TEXT | 投稿日時 |

### reactions
| カラム | 型 | 説明 |
|---|---|---|
| id | INTEGER PK | 連番 |
| post_id | TEXT FK | 投稿ID |
| reaction_key | TEXT | like / ear / laugh / clap / party / sparkle / melt |
| ip_hash | TEXT | リアクション者IPハッシュ |
| created_at | TEXT | 日時 |
