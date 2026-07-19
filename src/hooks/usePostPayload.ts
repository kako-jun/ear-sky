import { useCallback, useMemo } from "react";
import type { Post } from "@/types";
import type { parseVideoUrl } from "@/lib/video";
import type { CueInput, PostData } from "@/components/post-editor/types";

type ParsedVideo = ReturnType<typeof parseVideoUrl>;

interface UsePostPayloadParams {
  url: string;
  parsed: ParsedVideo;
  cues: CueInput[];
  subtitleCues: Post["cues"];
  artistName: string;
  songTitle: string;
  sourceLang: string;
  targetLang: string;
  nickname: string;
  deleteKey: string;
  era: string;
  comment: string;
  tags: string[];
}

export function usePostPayload({
  url,
  parsed,
  cues,
  subtitleCues,
  artistName,
  songTitle,
  sourceLang,
  targetLang,
  nickname,
  deleteKey,
  era,
  comment,
  tags,
}: UsePostPayloadParams) {
  const playStartSec = cues[0].startSec;
  const playEndSec = cues[cues.length - 1].endSec;
  const canPreview = parsed !== null && cues[0].endSec > cues[0].startSec;
  const canSubmit = canPreview && cues.every((cue) => cue.text.trim().length > 0);

  const previewPost: Post = useMemo(() => ({
    id: "preview",
    videoUrl: url,
    platform: parsed?.platform || "other",
    videoId: parsed?.videoId || "",
    startSec: playStartSec,
    endSec: playEndSec,
    misheardText: cues.map((cue) => cue.text.trim()).join("") || "...",
    originalText: cues.map((cue) => cue.originalText.trim()).filter(Boolean).join(" ") || undefined,
    artistName: artistName.trim() || "-",
    songTitle: songTitle.trim() || "-",
    sourceLang,
    targetLang,
    nickname: nickname.trim() || "Anonymous",
    likes: 0,
    createdAt: new Date().toISOString(),
    reactions: {},
    totalReactions: 0,
    playCount: 0,
    era: era.trim() || undefined,
    comment: comment.trim() || undefined,
    cues: subtitleCues,
    tags,
  }), [url, parsed, playStartSec, playEndSec, cues, subtitleCues, artistName, songTitle, sourceLang, targetLang, nickname, era, comment, tags]);

  const buildData = useCallback((): PostData | null => {
    if (!parsed) return null;
    const firstCue = cues[0];
    const lastCue = cues[cues.length - 1];
    return {
      videoUrl: url,
      platform: parsed.platform,
      videoId: parsed.videoId,
      startSec: firstCue.startSec,
      endSec: lastCue.endSec,
      misheardText: cues.map((cue) => cue.text.trim()).join(""),
      originalText: cues.map((cue) => cue.originalText.trim()).filter(Boolean).join(" ") || undefined,
      artistName: artistName.trim(),
      songTitle: songTitle.trim(),
      sourceLang,
      targetLang,
      nickname: nickname.trim() || "Anonymous",
      deleteKey: deleteKey.trim() || undefined,
      era: era.trim() || undefined,
      comment: comment.trim() || undefined,
      cues: subtitleCues,
      tags,
    };
  }, [url, parsed, cues, subtitleCues, artistName, songTitle, sourceLang, targetLang, nickname, deleteKey, era, comment, tags]);

  return { previewPost, buildData, canSubmit };
}
