CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  video_url TEXT NOT NULL,
  platform TEXT NOT NULL,
  video_id TEXT NOT NULL,
  start_sec REAL NOT NULL,
  end_sec REAL NOT NULL,
  misheard_text TEXT NOT NULL,
  original_text TEXT,
  artist_name TEXT NOT NULL DEFAULT '',
  song_title TEXT NOT NULL DEFAULT '',
  source_lang TEXT NOT NULL DEFAULT 'en',
  target_lang TEXT NOT NULL DEFAULT 'ja',
  nickname TEXT NOT NULL DEFAULT '名無し',
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL REFERENCES posts(id),
  reaction_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_likes ON posts(likes DESC);
CREATE INDEX idx_reactions_post_id ON reactions(post_id);
