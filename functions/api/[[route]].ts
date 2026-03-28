import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/cloudflare-pages";

type Bindings = {
  DB: D1Database;
};

const VALID_PLATFORMS = ["youtube", "niconico", "other"] as const;
const VALID_EMOJI = new Set([
  "👂", "🤣", "👏", "🎉", "✨", "🫠",
  "❤️", "🔥", "😭", "🤯", "💀", "👀",
  "🎵", "🙏", "😂", "🥹",
]);
const MAX_TEXT = 200;
const MAX_NAME = 30;
const MAX_URL = 2000;
const MAX_ERA = 20;
const MAX_SEGMENT_SEC = 300;

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = [
        "https://ear-sky.pages.dev",
        "https://ear-sky.llll-ll.com",
      ];
      // Allow localhost in development
      if (origin && (allowed.includes(origin) || origin.startsWith("http://localhost:"))) {
        return origin;
      }
      return allowed[0];
    },
  })
);

// --- Helpers ---

function getClientIp(c: { req: { raw: Request } }): string {
  return c.req.raw.headers.get("cf-connecting-ip") || "unknown";
}

function hashIp(ip: string): string {
  let h = 0;
  for (let i = 0; i < ip.length; i++) {
    h = ((h << 5) - h + ip.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function truncate(s: string, max: number): string {
  return s.slice(0, max);
}

async function getReactionCounts(db: D1Database, postId: string): Promise<Record<string, number>> {
  const { results } = await db.prepare(
    "SELECT reaction_key, COUNT(*) as cnt FROM reactions WHERE post_id = ? GROUP BY reaction_key"
  ).bind(postId).all();
  const map: Record<string, number> = {};
  for (const r of results || []) {
    map[r.reaction_key as string] = r.cnt as number;
  }
  return map;
}

// --- Row mapper ---

function mapRow(row: Record<string, unknown>) {
  const reactions = row.reactions_json ? JSON.parse(row.reactions_json as string) : {};
  const totalReactions = Object.values(reactions).reduce((sum: number, n) => sum + (n as number), 0);
  return {
    id: row.id,
    videoUrl: row.video_url,
    platform: row.platform,
    videoId: row.video_id,
    startSec: row.start_sec,
    endSec: row.end_sec,
    misheardText: row.misheard_text,
    originalText: row.original_text,
    artistName: row.artist_name,
    songTitle: row.song_title,
    sourceLang: row.source_lang,
    targetLang: row.target_lang,
    nickname: row.nickname,
    likes: row.likes,
    createdAt: row.created_at,
    deleteKey: undefined, // never expose
    reactions,
    totalReactions,
    era: row.era || undefined,
    comment: row.comment || undefined,
  };
}

const REACTIONS_SUBQUERY = `(SELECT json_group_object(reaction_key, cnt) FROM (
  SELECT reaction_key, COUNT(*) as cnt FROM reactions WHERE post_id = p.id GROUP BY reaction_key
)) as reactions_json`;

// --- Posts ---

app.get("/posts", async (c) => {
  const sort = c.req.query("sort") || "new";
  const month = c.req.query("month");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = Math.max(parseInt(c.req.query("offset") || "0"), 0);

  let query: string;
  const params: unknown[] = [];

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    query = `SELECT p.*, ${REACTIONS_SUBQUERY} FROM posts p
      WHERE p.created_at LIKE ? || '%'
      ORDER BY (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) DESC, p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(month, limit, offset);
  } else if (sort === "likes") {
    query = `SELECT p.*, ${REACTIONS_SUBQUERY} FROM posts p
      ORDER BY (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) DESC, p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
  } else {
    query = `SELECT p.*, ${REACTIONS_SUBQUERY} FROM posts p
      ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
  }

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ posts: (results || []).map(mapRow) });
});

app.get("/posts/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(
    `SELECT p.*, ${REACTIONS_SUBQUERY} FROM posts p WHERE p.id = ?`
  ).bind(id).first();

  if (!row) return c.json({ error: "not found" }, 404);
  return c.json({ post: mapRow(row) });
});

// POST /api/posts — with validation & rate limit
app.post("/posts", async (c) => {
  const ip = getClientIp(c);
  const ipHash = hashIp(ip);

  // Rate limit: 1 post per 30s per IP
  const recent = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM posts WHERE ip_hash = ? AND created_at > datetime('now', '-30 seconds')"
  ).bind(ipHash).first();
  if (recent && (recent.cnt as number) > 0) {
    return c.json({ error: "Please wait 30 seconds between posts" }, 429);
  }

  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return c.json({ error: "invalid body" }, 400); }
  const { videoUrl, platform, videoId, startSec, endSec, misheardText, originalText, artistName, songTitle, sourceLang, targetLang, nickname, deleteKey, era, comment } = body;

  // Validate required fields
  if (!videoUrl || !platform || !videoId || !misheardText) {
    return c.json({ error: "missing required fields" }, 400);
  }

  // Validate platform
  if (!VALID_PLATFORMS.includes(platform)) {
    return c.json({ error: "invalid platform" }, 400);
  }

  // Validate URL (XSS prevention)
  const safeUrl = sanitizeUrl(videoUrl);
  if (!safeUrl) {
    return c.json({ error: "invalid URL" }, 400);
  }

  // Validate video ID for other platform
  if (platform === "other") {
    const safeVideoId = sanitizeUrl(videoId);
    if (!safeVideoId) return c.json({ error: "invalid video URL" }, 400);
  }

  // Validate time range
  const start = Number(startSec) || 0;
  const end = Number(endSec) || 0;
  if (start < 0 || end <= start || end - start > MAX_SEGMENT_SEC) {
    return c.json({ error: "invalid time range" }, 400);
  }

  const id = crypto.randomUUID();
  const safeDeleteKey = typeof deleteKey === "string" ? truncate(deleteKey.trim(), 64) : null;

  await c.env.DB.prepare(
    `INSERT INTO posts (id, video_url, platform, video_id, start_sec, end_sec, misheard_text, original_text, artist_name, song_title, source_lang, target_lang, nickname, ip_hash, delete_key, era, comment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    truncate(safeUrl, MAX_URL),
    platform,
    truncate(platform === "other" ? sanitizeUrl(videoId)! : videoId, MAX_URL),
    start,
    end,
    truncate(misheardText.trim(), MAX_TEXT),
    originalText ? truncate(originalText.trim(), MAX_TEXT) : null,
    truncate((artistName || "").trim(), MAX_NAME * 3),
    truncate((songTitle || "").trim(), MAX_NAME * 3),
    truncate(sourceLang || "en", 10),
    truncate(targetLang || "ja", 10),
    truncate((nickname || "").trim(), MAX_NAME) || "Anonymous",
    ipHash,
    safeDeleteKey,
    era ? truncate(era.trim(), MAX_ERA) : null,
    comment ? truncate(comment.trim(), MAX_TEXT) : null,
  ).run();

  return c.json({ id }, 201);
});

// DELETE /api/posts/:id — requires deleteKey
app.delete("/posts/:id", async (c) => {
  const id = c.req.param("id");
  let body: { deleteKey?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "invalid body" }, 400); }
  const { deleteKey } = body;

  if (!deleteKey) return c.json({ error: "Delete key required" }, 400);

  const post = await c.env.DB.prepare(
    "SELECT delete_key FROM posts WHERE id = ?"
  ).bind(id).first();

  if (!post) return c.json({ error: "not found" }, 404);
  if (!post.delete_key || post.delete_key !== deleteKey) {
    return c.json({ error: "Delete key mismatch" }, 403);
  }

  await c.env.DB.prepare("DELETE FROM reactions WHERE post_id = ?").bind(id).run();
  await c.env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();

  return c.json({ success: true });
});

// PUT /api/posts/:id/reaction — set or switch reaction (1 per user per post)
app.put("/posts/:id/reaction", async (c) => {
  const id = c.req.param("id");
  let body: { emoji?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "invalid body" }, 400); }
  const { emoji } = body;

  if (!emoji || !VALID_EMOJI.has(emoji)) {
    return c.json({ error: "invalid emoji" }, 400);
  }

  const ipHash = hashIp(getClientIp(c));

  // Check if post exists
  const post = await c.env.DB.prepare("SELECT id FROM posts WHERE id = ?").bind(id).first();
  if (!post) return c.json({ error: "not found" }, 404);

  // Upsert: INSERT OR REPLACE using the unique index on (post_id, ip_hash)
  const existing = await c.env.DB.prepare(
    "SELECT id FROM reactions WHERE post_id = ? AND ip_hash = ?"
  ).bind(id, ipHash).first();

  if (existing) {
    await c.env.DB.prepare(
      "UPDATE reactions SET reaction_key = ?, created_at = datetime('now') WHERE post_id = ? AND ip_hash = ?"
    ).bind(emoji, id, ipHash).run();
  } else {
    await c.env.DB.prepare(
      "INSERT INTO reactions (post_id, reaction_key, ip_hash) VALUES (?, ?, ?)"
    ).bind(id, emoji, ipHash).run();
  }

  const reactions = await getReactionCounts(c.env.DB, id);
  return c.json({ reactions, myEmoji: emoji });
});

// DELETE /api/posts/:id/reaction — remove your reaction
app.delete("/posts/:id/reaction", async (c) => {
  const id = c.req.param("id");
  const ipHash = hashIp(getClientIp(c));

  await c.env.DB.prepare(
    "DELETE FROM reactions WHERE post_id = ? AND ip_hash = ?"
  ).bind(id, ipHash).run();

  const reactions = await getReactionCounts(c.env.DB, id);
  return c.json({ reactions, myEmoji: null });
});

export const onRequest = handle(app);
