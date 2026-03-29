-- Add ON DELETE CASCADE to reactions and post_tags tables
-- SQLite doesn't support ALTER TABLE to add/modify foreign keys,
-- so we rebuild the tables.

-- Rebuild reactions with ON DELETE CASCADE
CREATE TABLE reactions_v3 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reaction_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_hash TEXT NOT NULL DEFAULT ''
);

INSERT INTO reactions_v3 (id, post_id, reaction_key, created_at, ip_hash)
SELECT id, post_id, reaction_key, created_at, ip_hash FROM reactions;

DROP TABLE reactions;
ALTER TABLE reactions_v3 RENAME TO reactions;

CREATE UNIQUE INDEX idx_reactions_user_post ON reactions(post_id, ip_hash);
CREATE INDEX idx_reactions_post_key ON reactions(post_id, reaction_key);

-- Rebuild post_tags with ON DELETE CASCADE
CREATE TABLE post_tags_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  UNIQUE(post_id, tag)
);

INSERT INTO post_tags_v2 (id, post_id, tag)
SELECT id, post_id, tag FROM post_tags;

DROP TABLE post_tags;
ALTER TABLE post_tags_v2 RENAME TO post_tags;

CREATE INDEX idx_post_tags_tag ON post_tags(tag);
CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
