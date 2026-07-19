import { useCallback, useMemo, useState } from "react";
import type { SubtitleCue } from "@/types";
import type { CueInput, PostData } from "@/components/post-editor/types";

const MAX_CUES = 3;

function createDefaultCue(): CueInput {
  return {
    id: crypto.randomUUID(),
    startSec: 0,
    endSec: 10,
    text: "",
    originalText: "",
  };
}

function cueFromDraft(data: PostData): CueInput[] {
  if (data.cues && data.cues.length > 0) {
    return data.cues.map((cue) => ({
      id: crypto.randomUUID(),
      startSec: cue.showAt,
      endSec: cue.showAt + cue.duration,
      text: cue.text,
      originalText: cue.originalText || "",
    }));
  }

  return [{
    id: crypto.randomUUID(),
    startSec: data.startSec,
    endSec: data.endSec,
    text: data.misheardText,
    originalText: data.originalText || "",
  }];
}

export function useCueEditor(videoDuration: number) {
  const [cues, setCues] = useState<CueInput[]>([createDefaultCue()]);

  const applyUrlStartSec = useCallback((startSec: number) => {
    setCues((prev) => {
      const first = prev[0];
      if (first.startSec === 0 && first.endSec === 10) {
        return [{ ...first, startSec, endSec: startSec + 5 }, ...prev.slice(1)];
      }
      return prev;
    });
  }, []);

  const restoreCues = useCallback((data: PostData) => {
    setCues(cueFromDraft(data));
  }, []);

  const updateCue = useCallback((index: number, patch: Partial<CueInput>) => {
    setCues((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };

      if (patch.startSec != null && index > 0) {
        next[index - 1] = { ...next[index - 1], endSec: patch.startSec };
      }

      for (let i = index + 1; i < next.length; i++) {
        next[i] = { ...next[i], startSec: next[i - 1].endSec };
        if (next[i].endSec <= next[i].startSec) {
          next[i] = { ...next[i], endSec: next[i].startSec + 3 };
        }
      }

      return next;
    });
  }, []);

  const addCue = useCallback(() => {
    setCues((prev) => {
      if (prev.length >= MAX_CUES) return prev;
      const last = prev[prev.length - 1];
      if (last.endSec >= videoDuration) return prev;
      return [...prev, {
        id: crypto.randomUUID(),
        startSec: last.endSec,
        endSec: Math.min(last.endSec + 5, videoDuration),
        text: "",
        originalText: "",
      }];
    });
  }, [videoDuration]);

  const removeCue = useCallback((index: number) => {
    setCues((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      for (let i = 1; i < next.length; i++) {
        next[i] = { ...next[i], startSec: next[i - 1].endSec };
      }
      return next;
    });
  }, []);

  const subtitleCues: SubtitleCue[] = useMemo(
    () => cues.map((cue) => ({
      text: cue.text,
      originalText: cue.originalText || undefined,
      showAt: cue.startSec,
      duration: cue.endSec - cue.startSec,
    })),
    [cues]
  );

  return {
    cues,
    maxCues: MAX_CUES,
    subtitleCues,
    applyUrlStartSec,
    restoreCues,
    updateCue,
    addCue,
    removeCue,
  };
}
