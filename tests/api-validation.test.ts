import { describe, expect, it } from "vitest";
import { app } from "../functions/api/[[route]]";

interface CapturedStatement {
  sql: string;
  args: unknown[];
}

class FakeStatement {
  args: unknown[] = [];

  constructor(
    private readonly db: FakeD1Database,
    readonly sql: string,
  ) {}

  bind(...args: unknown[]) {
    this.args = args;
    return this;
  }

  async first() {
    this.db.executed.push({ sql: this.sql, args: this.args });
    if (this.sql.includes("COUNT(*) as cnt FROM posts WHERE ip_hash")) return { cnt: 0 };
    if (this.sql.includes("SELECT id FROM posts WHERE id")) return { id: "post-1" };
    return null;
  }

  async all() {
    this.db.executed.push({ sql: this.sql, args: this.args });
    return { results: [] };
  }

  async run() {
    this.db.executed.push({ sql: this.sql, args: this.args });
    return { success: true };
  }
}

class FakeD1Database {
  executed: CapturedStatement[] = [];
  batched: CapturedStatement[][] = [];

  prepare(sql: string) {
    return new FakeStatement(this, sql);
  }

  async batch(statements: FakeStatement[]) {
    this.batched.push(statements.map((statement) => ({
      sql: statement.sql,
      args: statement.args,
    })));
    return [];
  }
}

function createDb() {
  return new FakeD1Database() as unknown as D1Database & FakeD1Database;
}

const validPost = {
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
  platform: "youtube",
  videoId: "dQw4w9WgXcQ",
  startSec: 42,
  endSec: 47,
  misheardText: "Never gonna give you soup",
  originalText: "Never gonna give you up",
  artistName: "Rick Astley",
  songTitle: "Never Gonna Give You Up",
  sourceLang: "en",
  targetLang: "ja",
  nickname: "tester",
  deleteKey: "secret",
  era: "1987",
  comment: "A classic kitchen hallucination",
  cues: [
    {
      text: "Never gonna give you soup",
      originalText: "Never gonna give you up",
      showAt: 42,
      duration: 5,
    },
  ],
  tags: ["anime", "bogus", "pop", "metal", "game"],
};

async function requestApi(path: string, body: unknown, db = createDb()) {
  const response = await app.request(
    path,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "cf-connecting-ip": "203.0.113.10",
      },
      body: JSON.stringify(body),
    },
    { DB: db },
  );
  return { response, db };
}

describe("POST /api/posts validation", () => {
  it("accepts a valid post and filters tags to known IDs with the server max", async () => {
    const { response, db } = await requestApi("/api/posts", validPost);

    expect(response.status).toBe(201);
    const [batch] = db.batched;
    expect(batch).toBeTruthy();
    const tagStatements = batch.filter((statement) => statement.sql.includes("INSERT INTO post_tags"));
    expect(tagStatements.map((statement) => statement.args[1])).toEqual(["anime", "pop", "metal"]);
  });

  it("rejects unknown platforms", async () => {
    const { response } = await requestApi("/api/posts", { ...validPost, platform: "vimeo" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid platform" });
  });

  it("rejects non-http URLs", async () => {
    const { response } = await requestApi("/api/posts", { ...validPost, videoUrl: "javascript:alert(1)" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid URL" });
  });

  it("rejects overlong time ranges", async () => {
    const { response } = await requestApi("/api/posts", { ...validPost, startSec: 1, endSec: 302 });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid time range" });
  });

  it("rejects missing cues", async () => {
    const { response } = await requestApi("/api/posts", { ...validPost, cues: [] });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "at least one cue is required" });
  });
});

describe("PUT /api/posts/:id/reaction validation", () => {
  it("rejects emoji outside the curated set before touching D1", async () => {
    const db = createDb();
    const response = await app.request(
      "/api/posts/post-1/reaction",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "cf-connecting-ip": "203.0.113.10",
        },
        body: JSON.stringify({ emoji: "🔥" }),
      },
      { DB: db },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid emoji" });
    expect(db.executed).toEqual([]);
    expect(db.batched).toEqual([]);
  });
});
