-- Add play count to posts
ALTER TABLE posts ADD COLUMN play_count INTEGER NOT NULL DEFAULT 0;
