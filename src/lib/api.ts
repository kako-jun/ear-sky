import { Post } from "@/types";

const API_BASE = "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function parseJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    throw new ApiError("Server error", res.status);
  }
}

export interface PostsResult {
  posts: Post[];
  total: number;
}

export async function fetchPosts(opts: {
  sort?: "new" | "likes";
  month?: string;
  q?: string;
  sourceLang?: string;
  targetLang?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
} = {}): Promise<PostsResult> {
  const params = new URLSearchParams({ sort: opts.sort || "new" });
  if (opts.month) params.set("month", opts.month);
  if (opts.q) params.set("q", opts.q);
  if (opts.sourceLang) params.set("sourceLang", opts.sourceLang);
  if (opts.targetLang) params.set("targetLang", opts.targetLang);
  if (opts.tags && opts.tags.length > 0) params.set("tags", opts.tags.join(","));
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const res = await fetch(`${API_BASE}/posts?${params}`);
  if (!res.ok) throw new ApiError("Failed to load posts", res.status);
  const data = await parseJsonSafe(res);
  return { posts: data.posts, total: data.total ?? data.posts.length };
}

export async function fetchPost(id: string): Promise<Post | null> {
  const res = await fetch(`${API_BASE}/posts/${id}`);
  if (!res.ok) return null;
  const data = await parseJsonSafe(res);
  return data.post;
}

export async function createPost(
  data: Omit<Post, "id" | "likes" | "createdAt" | "reactions" | "totalReactions" | "playCount"> & { deleteKey?: string }
): Promise<string> {
  const res = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await parseJsonSafe(res);
  if (!res.ok) throw new ApiError(result.error || "Failed to post", res.status);
  return result.id;
}

export async function deletePost(id: string, deleteKey: string): Promise<void> {
  const res = await fetch(`${API_BASE}/posts/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deleteKey }),
  });
  if (!res.ok) {
    const result = await parseJsonSafe(res);
    throw new ApiError(result.error || "Failed to delete", res.status);
  }
}

export async function setReaction(
  postId: string,
  emoji: string
): Promise<{ reactions: Record<string, number>; myEmoji: string }> {
  const res = await fetch(`${API_BASE}/posts/${postId}/reaction`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new ApiError(data.error || "Failed to react", res.status);
  return data;
}

export async function recordPlay(postId: string): Promise<void> {
  fetch(`${API_BASE}/posts/${postId}/play`, { method: "POST" }).catch(() => {});
}

export async function removeReaction(
  postId: string
): Promise<{ reactions: Record<string, number>; myEmoji: null }> {
  const res = await fetch(`${API_BASE}/posts/${postId}/reaction`, {
    method: "DELETE",
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new ApiError(data.error || "Failed to remove reaction", res.status);
  return data;
}
