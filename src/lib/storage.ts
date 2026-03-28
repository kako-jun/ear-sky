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

// Old key→emoji mapping for localStorage migration
const OLD_KEY_TO_EMOJI: Record<string, string> = {
  like: "❤️",
  ear: "👂",
  laugh: "🤣",
  clap: "👏",
  party: "🎉",
  sparkle: "✨",
  melt: "🫠",
};

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
  data: Omit<Post, "id" | "likes" | "createdAt" | "reactions" | "totalReactions">,
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

// --- Reaction tracking (1 emoji per post per browser) ---

function getReactionsMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(REACTIONS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function getMyReaction(postId: string): string | null {
  const map = getReactionsMap();
  return map[postId] || null;
}

export function setMyReaction(postId: string, emoji: string): void {
  const map = getReactionsMap();
  map[postId] = emoji;
  safeSetItem(REACTIONS_KEY, JSON.stringify(map));
}

export function clearMyReaction(postId: string): void {
  const map = getReactionsMap();
  delete map[postId];
  safeSetItem(REACTIONS_KEY, JSON.stringify(map));
}

// --- Migration from old array format ---

export function migrateReactionsStorage(): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(REACTIONS_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    // Detect old format: values are arrays of strings
    const firstValue = Object.values(parsed)[0];
    if (!Array.isArray(firstValue)) return; // Already new format

    const newMap: Record<string, string> = {};
    for (const [postId, types] of Object.entries(parsed)) {
      const arr = types as string[];
      if (arr.length === 0) continue;
      // Take the first reaction and map it to emoji
      const oldKey = arr[0];
      newMap[postId] = OLD_KEY_TO_EMOJI[oldKey] || "❤️";
    }
    safeSetItem(REACTIONS_KEY, JSON.stringify(newMap));
  } catch {
    // Corrupted data, clear it
    localStorage.removeItem(REACTIONS_KEY);
  }
}
