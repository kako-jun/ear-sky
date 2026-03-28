import { Post, Draft } from "@/types";

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota exceeded or private browsing */
  }
}

const DRAFTS_KEY = "ear-sky-drafts";
const REACTIONS_KEY = "ear-sky-reactions";

// --- Drafts (local only) ---

export function getAllDrafts(): Draft[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(DRAFTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Draft[];
  } catch {
    return [];
  }
}

export function saveDraft(
  data: Omit<Post, "id" | "likes" | "createdAt" | "reactions">,
  existingId?: string
): Draft {
  const drafts = getAllDrafts();
  if (existingId) {
    const idx = drafts.findIndex((d) => d.id === existingId);
    if (idx >= 0) {
      drafts[idx] = {
        id: existingId,
        data,
        updatedAt: new Date().toISOString(),
      };
      safeSetItem(DRAFTS_KEY, JSON.stringify(drafts));
      return drafts[idx];
    }
  }
  const draft: Draft = {
    id: crypto.randomUUID(),
    data,
    updatedAt: new Date().toISOString(),
  };
  drafts.unshift(draft);
  safeSetItem(DRAFTS_KEY, JSON.stringify(drafts));
  return draft;
}

export function deleteDraft(id: string): void {
  const drafts = getAllDrafts().filter((d) => d.id !== id);
  safeSetItem(DRAFTS_KEY, JSON.stringify(drafts));
}

// --- Reaction tracking (prevent duplicate reactions per browser) ---

export function hasReacted(postId: string, type: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(REACTIONS_KEY);
  if (!raw) return false;
  try {
    const map = JSON.parse(raw) as Record<string, string[]>;
    return (map[postId] || []).includes(type);
  } catch {
    return false;
  }
}

export function markReacted(postId: string, type: string): void {
  const raw = localStorage.getItem(REACTIONS_KEY);
  let map: Record<string, string[]> = {};
  try {
    if (raw) map = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  if (!map[postId]) map[postId] = [];
  if (!map[postId].includes(type)) {
    map[postId].push(type);
  }
  safeSetItem(REACTIONS_KEY, JSON.stringify(map));
}
