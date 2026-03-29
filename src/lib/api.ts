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

export async function fetchPosts(
  sort: "new" | "likes" = "new",
  month?: string
): Promise<Post[]> {
  const params = new URLSearchParams({ sort });
  if (month) params.set("month", month);
  const res = await fetch(`${API_BASE}/posts?${params}`);
  if (!res.ok) return [];
  const data = await parseJsonSafe(res);
  return data.posts;
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
