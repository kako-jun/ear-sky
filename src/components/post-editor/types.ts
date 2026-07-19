import type { Post } from "@/types";

export type PostData = Omit<
  Post,
  "id" | "likes" | "createdAt" | "reactions" | "totalReactions" | "playCount"
> & { deleteKey?: string };

export interface CueInput {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
  originalText: string;
}
