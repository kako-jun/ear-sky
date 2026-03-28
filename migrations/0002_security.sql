ALTER TABLE posts ADD COLUMN ip_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN delete_key TEXT;
ALTER TABLE reactions ADD COLUMN ip_hash TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_posts_ip_hash ON posts(ip_hash);
CREATE INDEX idx_reactions_dedup ON reactions(post_id, reaction_key, ip_hash);
