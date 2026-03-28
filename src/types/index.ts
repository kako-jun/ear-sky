export interface Post {
  id: string;
  videoUrl: string;
  platform: "youtube" | "niconico" | "other";
  videoId: string;
  startSec: number;
  endSec: number;
  misheardText: string;
  originalText?: string;
  artistName: string;
  songTitle: string;
  sourceLang: string;
  targetLang: string;
  nickname: string;
  likes: number;
  createdAt: string;
  reactions: Record<string, number>;
}

export interface Draft {
  id: string;
  data: Omit<Post, "id" | "likes" | "createdAt" | "reactions">;
  updatedAt: string;
}

export const LANGUAGES = [
  { code: "ja", label: "日本語", labelEn: "Japanese" },
  { code: "en", label: "English", labelEn: "English" },
  { code: "ko", label: "한국어", labelEn: "Korean" },
  { code: "zh", label: "中文", labelEn: "Chinese" },
  { code: "es", label: "Español", labelEn: "Spanish" },
  { code: "fr", label: "Français", labelEn: "French" },
  { code: "de", label: "Deutsch", labelEn: "German" },
  { code: "pt", label: "Português", labelEn: "Portuguese" },
  { code: "it", label: "Italiano", labelEn: "Italian" },
  { code: "ru", label: "Русский", labelEn: "Russian" },
  { code: "other", label: "その他 / Other", labelEn: "Other" },
] as const;

export const REACTION_KEYS = [
  "ear",
  "laugh",
  "clap",
  "party",
  "sparkle",
  "melt",
] as const;

export type ReactionKey = (typeof REACTION_KEYS)[number];

export interface BanterLine {
  speaker: "master" | "regular";
  text: string;
}

export interface PickupEntry {
  postId?: string;
  misheardText: string;
  originalText?: string;
  artistName: string;
  songTitle: string;
  year: number;
  videoUrl: string;
  startSec: number;
  endSec: number;
  banter: BanterLine[];
}

export interface Pickup {
  id: string;
  title: string;
  publishedAt: string;
  picks: PickupEntry[];
}
