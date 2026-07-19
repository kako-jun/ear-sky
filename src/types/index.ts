import type { Platform } from "@/shared/domain";

export interface SubtitleCue {
  text: string;
  originalText?: string;
  showAt: number;
  duration: number;
}

export interface Post {
  id: string;
  videoUrl: string;
  platform: Platform;
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
