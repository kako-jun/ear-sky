export const VALID_TAGS = [
  // Source
  { id: "anime", labelEn: "Anime", labelJa: "アニメ" },
  { id: "game", labelEn: "Game", labelJa: "ゲーム" },
  { id: "vocaloid", labelEn: "Vocaloid", labelJa: "ボカロ" },
  { id: "movie", labelEn: "Movie", labelJa: "映画" },
  { id: "drama", labelEn: "Drama", labelJa: "ドラマ" },
  { id: "cm", labelEn: "CM", labelJa: "CM" },
  // Genre
  { id: "rock", labelEn: "Rock", labelJa: "ロック" },
  { id: "pop", labelEn: "Pop", labelJa: "ポップ" },
  { id: "hiphop", labelEn: "Hip-Hop", labelJa: "ヒップホップ" },
  { id: "metal", labelEn: "Metal", labelJa: "メタル" },
] as const;

export type TagId = typeof VALID_TAGS[number]["id"];
export const TAG_IDS = VALID_TAGS.map((t) => t.id);
export const MAX_TAGS = 3;
export const PAGE_SIZE = 10;

export interface SubtitleCue {
  text: string;
  originalText?: string;
  showAt: number;
  duration: number;
}

export interface Post {
  id: string;
  videoUrl: string;
  platform: "youtube" | "niconico" | "soundcloud" | "other";
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
  totalReactions: number;
  era?: string;
  comment?: string;
  playCount: number;
  cues: SubtitleCue[];
  tags: string[];
}

export interface Draft {
  id: string;
  data: Omit<Post, "id" | "likes" | "createdAt" | "reactions" | "totalReactions" | "playCount">;
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

export const CURATED_EMOJI = [
  // Face emoji
  { emoji: "👂", label: "聴こえた", labelEn: "Heard it" },
  { emoji: "🤣", label: "笑った", labelEn: "Laughed" },
  { emoji: "😂", label: "ウケる", labelEn: "LOL" },
  { emoji: "🥹", label: "エモい", labelEn: "Emotional" },
  { emoji: "🤯", label: "衝撃", labelEn: "Mind-blown" },
  { emoji: "🫠", label: "ヤバい", labelEn: "Crazy" },
  { emoji: "👏", label: "すごい", labelEn: "Amazing" },
  // Symbol emoji
  { emoji: "👀", label: "気になる", labelEn: "Interesting" },
  { emoji: "✨", label: "天才", labelEn: "Genius" },
  { emoji: "❤️", label: "好き", labelEn: "Love" },
  { emoji: "🎉", label: "最高", labelEn: "Best" },
  { emoji: "🎵", label: "ノリノリ", labelEn: "Groovy" },
] as const;

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
  cues?: SubtitleCue[];
}

export interface Pickup {
  id: string;
  title: string;
  publishedAt: string;
  picks: PickupEntry[];
}
