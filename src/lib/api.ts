import { Post } from "@/types";

const API_BASE = "/api";

export async function fetchPosts(
  sort: "new" | "likes" = "new",
  month?: string
): Promise<Post[]> {
  const params = new URLSearchParams({ sort });
  if (month) params.set("month", month);
  const res = await fetch(`${API_BASE}/posts?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.posts;
}

export async function fetchPost(id: string): Promise<Post | null> {
  const res = await fetch(`${API_BASE}/posts/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.post;
}

export async function createPost(
  data: Omit<Post, "id" | "likes" | "createdAt" | "reactions">
): Promise<string> {
  const res = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  return result.id;
}

export async function likePost(id: string): Promise<number> {
  const res = await fetch(`${API_BASE}/posts/${id}/like`, { method: "POST" });
  const data = await res.json();
  return data.likes;
}

export async function reactToPost(
  id: string,
  key: string
): Promise<number> {
  const res = await fetch(`${API_BASE}/posts/${id}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  const data = await res.json();
  return data.count;
}
