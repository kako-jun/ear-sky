-- Tags for posts (genre/source categorization)
CREATE TABLE IF NOT EXISTS post_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  UNIQUE(post_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag);
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);
