export const VALID_PLATFORMS = ["youtube", "niconico", "soundcloud", "other"] as const;
export type Platform = typeof VALID_PLATFORMS[number];

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
export const TAG_ID_SET = new Set<string>(TAG_IDS);

export const MAX_TAGS = 3;
export const PAGE_SIZE = 10;

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

export const CURATED_EMOJI_SET = new Set<string>(CURATED_EMOJI.map((item) => item.emoji));

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

export const MAX_TEXT = 200;
export const MAX_NAME = 30;
export const MAX_URL = 2000;
export const MAX_ERA = 20;
export const MAX_SEGMENT_SEC = 300;
