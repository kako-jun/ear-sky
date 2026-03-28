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
    throw new ApiError("サーバーエラーが発生しました", res.status);
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
  data: Omit<Post, "id" | "likes" | "createdAt" | "reactions"> & { deleteKey?: string }
): Promise<string> {
  const res = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await parseJsonSafe(res);
  if (!res.ok) throw new ApiError(result.error || "投稿に失敗しました", res.status);
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
    throw new ApiError(result.error || "削除に失敗しました", res.status);
  }
}

export async function likePost(id: string): Promise<number> {
  const res = await fetch(`${API_BASE}/posts/${id}/like`, { method: "POST" });
  const data = await parseJsonSafe(res);
  return data.likes;
}

export async function reactToPost(id: string, key: string): Promise<number> {
  const res = await fetch(`${API_BASE}/posts/${id}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  const data = await parseJsonSafe(res);
  return data.count;
}
