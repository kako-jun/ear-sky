export interface SubtitleCue {
  text: string;
  originalText?: string;
  showAt: number;
  duration: number;
}

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
  totalReactions: number;
  era?: string;
  comment?: string;
  cues: SubtitleCue[];
}

export interface Draft {
  id: string;
  data: Omit<Post, "id" | "likes" | "createdAt" | "reactions" | "totalReactions">;
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
  { emoji: "👂", label: "聴こえた", labelEn: "Heard it" },
  { emoji: "🤣", label: "笑った", labelEn: "Laughed" },
  { emoji: "👏", label: "すごい", labelEn: "Amazing" },
  { emoji: "🎉", label: "最高", labelEn: "Best" },
  { emoji: "✨", label: "天才", labelEn: "Genius" },
  { emoji: "🫠", label: "ヤバい", labelEn: "Crazy" },
  { emoji: "❤️", label: "好き", labelEn: "Love" },
  { emoji: "🔥", label: "激アツ", labelEn: "Fire" },
  { emoji: "😭", label: "泣いた", labelEn: "Crying" },
  { emoji: "🤯", label: "衝撃", labelEn: "Mind-blown" },
  { emoji: "💀", label: "死んだ", labelEn: "Dead" },
  { emoji: "👀", label: "気になる", labelEn: "Interesting" },
  { emoji: "🎵", label: "ノリノリ", labelEn: "Groovy" },
  { emoji: "🙏", label: "感謝", labelEn: "Thanks" },
  { emoji: "😂", label: "ウケる", labelEn: "LOL" },
  { emoji: "🥹", label: "エモい", labelEn: "Emotional" },
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
}

export interface Pickup {
  id: string;
  title: string;
  publishedAt: string;
  picks: PickupEntry[];
}
