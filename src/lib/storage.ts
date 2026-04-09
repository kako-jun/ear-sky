import { Post, Draft } from "@/types";

// --- Single root key for all localStorage data ---

const ROOT_KEY = "ear-sky";

interface StorageData {
  nickname?: string;
  deleteKey?: string;
  drafts?: Draft[];
  reactions?: Record<string, string>;
  locale?: string;
  langFilter?: string;
}

function readRoot(): StorageData {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ROOT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StorageData;
  } catch {
    return {};
  }
}

function writeRoot(data: StorageData): void {
  try {
    localStorage.setItem(ROOT_KEY, JSON.stringify(data));
  } catch {
    /* quota exceeded or private browsing */
  }
}

function updateRoot(updater: (data: StorageData) => void): void {
  const data = readRoot();
  updater(data);
  writeRoot(data);
}

// --- Generic getters/setters ---

export function getStorageValue<K extends keyof StorageData>(key: K): StorageData[K] {
  return readRoot()[key];
}

export function setStorageValue<K extends keyof StorageData>(key: K, value: StorageData[K]): void {
  updateRoot((data) => { data[key] = value; });
}

// --- Drafts (local only) ---

export function getAllDrafts(): Draft[] {
  return readRoot().drafts ?? [];
}

export function saveDraft(
  data: Omit<Post, "id" | "likes" | "createdAt" | "reactions" | "totalReactions" | "playCount">,
  existingId?: string
): Draft {
  const root = readRoot();
  const drafts = root.drafts ?? [];
  if (existingId) {
    const idx = drafts.findIndex((d) => d.id === existingId);
    if (idx >= 0) {
      drafts[idx] = {
        id: existingId,
        data,
        updatedAt: new Date().toISOString(),
      };
      root.drafts = drafts;
      writeRoot(root);
      return drafts[idx];
    }
  }
  const draft: Draft = {
    id: crypto.randomUUID(),
    data,
    updatedAt: new Date().toISOString(),
  };
  drafts.unshift(draft);
  root.drafts = drafts;
  writeRoot(root);
  return draft;
}

export function deleteDraft(id: string): void {
  updateRoot((data) => {
    data.drafts = (data.drafts ?? []).filter((d) => d.id !== id);
  });
}

// --- Reaction tracking (1 emoji per post per browser) ---

export function getMyReaction(postId: string): string | null {
  const reactions = readRoot().reactions ?? {};
  return reactions[postId] || null;
}

export function setMyReaction(postId: string, emoji: string): void {
  updateRoot((data) => {
    const reactions = data.reactions ?? {};
    reactions[postId] = emoji;
    data.reactions = reactions;
  });
}

export function clearMyReaction(postId: string): void {
  updateRoot((data) => {
    const reactions = data.reactions ?? {};
    delete reactions[postId];
    data.reactions = reactions;
  });
}
