import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

app.use("*", cors());

// --- Posts ---

// GET /api/posts?sort=new|likes&month=2026-03&limit=50&offset=0
app.get("/posts", async (c) => {
  const sort = c.req.query("sort") || "new";
  const month = c.req.query("month");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = parseInt(c.req.query("offset") || "0");

  let query: string;
  const params: unknown[] = [];

  if (month) {
    // Monthly ranking
    query = `
      SELECT p.*,
        (SELECT json_group_object(reaction_key, cnt) FROM (
          SELECT reaction_key, COUNT(*) as cnt FROM reactions WHERE post_id = p.id GROUP BY reaction_key
        )) as reactions_json
      FROM posts p
      WHERE p.created_at LIKE ? || '%'
      ORDER BY p.likes DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(month, limit, offset);
  } else if (sort === "likes") {
    // Hall of fame
    query = `
      SELECT p.*,
        (SELECT json_group_object(reaction_key, cnt) FROM (
          SELECT reaction_key, COUNT(*) as cnt FROM reactions WHERE post_id = p.id GROUP BY reaction_key
        )) as reactions_json
      FROM posts p
      ORDER BY p.likes DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);
  } else {
    // New
    query = `
      SELECT p.*,
        (SELECT json_group_object(reaction_key, cnt) FROM (
          SELECT reaction_key, COUNT(*) as cnt FROM reactions WHERE post_id = p.id GROUP BY reaction_key
        )) as reactions_json
      FROM posts p
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);
  }

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  const posts = (results || []).map((row: Record<string, unknown>) => ({
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
    reactions: row.reactions_json ? JSON.parse(row.reactions_json as string) : {},
  }));

  return c.json({ posts });
});

// GET /api/posts/:id
app.get("/posts/:id", async (c) => {
  const id = c.req.param("id");

  const row = await c.env.DB.prepare(
    `SELECT p.*,
      (SELECT json_group_object(reaction_key, cnt) FROM (
        SELECT reaction_key, COUNT(*) as cnt FROM reactions WHERE post_id = p.id GROUP BY reaction_key
      )) as reactions_json
    FROM posts p WHERE p.id = ?`
  )
    .bind(id)
    .first();

  if (!row) return c.json({ error: "not found" }, 404);

  return c.json({
    post: {
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
      reactions: row.reactions_json
        ? JSON.parse(row.reactions_json as string)
        : {},
    },
  });
});

// POST /api/posts
app.post("/posts", async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();

  const {
    videoUrl,
    platform,
    videoId,
    startSec,
    endSec,
    misheardText,
    originalText,
    artistName,
    songTitle,
    sourceLang,
    targetLang,
    nickname,
  } = body;

  if (!videoUrl || !platform || !videoId || !misheardText) {
    return c.json({ error: "missing required fields" }, 400);
  }

  await c.env.DB.prepare(
    `INSERT INTO posts (id, video_url, platform, video_id, start_sec, end_sec, misheard_text, original_text, artist_name, song_title, source_lang, target_lang, nickname)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      videoUrl,
      platform,
      videoId,
      startSec || 0,
      endSec || 0,
      misheardText,
      originalText || null,
      artistName || "",
      songTitle || "",
      sourceLang || "en",
      targetLang || "ja",
      nickname || "名無し"
    )
    .run();

  return c.json({ id }, 201);
});

// POST /api/posts/:id/like
app.post("/posts/:id/like", async (c) => {
  const id = c.req.param("id");
  const result = await c.env.DB.prepare(
    "UPDATE posts SET likes = likes + 1 WHERE id = ?"
  )
    .bind(id)
    .run();

  if (!result.meta.changes) return c.json({ error: "not found" }, 404);

  const row = await c.env.DB.prepare("SELECT likes FROM posts WHERE id = ?")
    .bind(id)
    .first();

  return c.json({ likes: row?.likes || 0 });
});

// POST /api/posts/:id/react
app.post("/posts/:id/react", async (c) => {
  const id = c.req.param("id");
  const { key } = await c.req.json();

  if (!key) return c.json({ error: "missing key" }, 400);

  await c.env.DB.prepare(
    "INSERT INTO reactions (post_id, reaction_key) VALUES (?, ?)"
  )
    .bind(id, key)
    .run();

  const row = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM reactions WHERE post_id = ? AND reaction_key = ?"
  )
    .bind(id, key)
    .first();

  return c.json({ count: row?.cnt || 0 });
});

import { handle } from "hono/cloudflare-pages";

export const onRequest = handle(app);
