-- 0003: Emoji reactions (1 per user per post) + era/comment fields

-- Add new columns to posts
ALTER TABLE posts ADD COLUMN era TEXT;
ALTER TABLE posts ADD COLUMN comment TEXT;

-- Rebuild reactions table: one emoji per user per post
CREATE TABLE reactions_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL REFERENCES posts(id),
  reaction_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_hash TEXT NOT NULL DEFAULT ''
);

-- Migrate existing data: keep most recent reaction per (post_id, ip_hash)
-- Map old string keys to emoji characters
INSERT INTO reactions_v2 (post_id, reaction_key, created_at, ip_hash)
SELECT post_id,
  CASE reaction_key
    WHEN 'like' THEN '❤️'
    WHEN 'ear' THEN '👂'
    WHEN 'laugh' THEN '🤣'
    WHEN 'clap' THEN '👏'
    WHEN 'party' THEN '🎉'
    WHEN 'sparkle' THEN '✨'
    WHEN 'melt' THEN '🫠'
    ELSE reaction_key
  END,
  created_at,
  ip_hash
FROM reactions
WHERE id IN (
  SELECT MAX(id) FROM reactions GROUP BY post_id, ip_hash
);

DROP TABLE reactions;
ALTER TABLE reactions_v2 RENAME TO reactions;

-- One reaction per user per post
CREATE UNIQUE INDEX idx_reactions_user_post ON reactions(post_id, ip_hash);
-- For counting by emoji
CREATE INDEX idx_reactions_post_key ON reactions(post_id, reaction_key);
