-- 0004: Subtitle cues — multiple timed subtitles per post
-- Separates subtitle timing from the post's play region.
-- Existing posts get a single cue migrated from misheard_text + start_sec + end_sec.

CREATE TABLE cues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  original_text TEXT,
  show_at REAL NOT NULL,
  duration REAL NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_cues_post_id ON cues(post_id);

-- Migrate existing data: one cue per post from misheard_text + time range
INSERT INTO cues (post_id, text, original_text, show_at, duration, sort_order)
SELECT id, misheard_text, original_text, start_sec, (end_sec - start_sec), 0
FROM posts;
