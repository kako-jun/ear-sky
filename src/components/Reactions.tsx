import { useState, useCallback, useEffect, useRef } from "react";
import { CURATED_EMOJI } from "@/types";
import { getMyReaction, setMyReaction, clearMyReaction } from "@/lib/storage";
import { setReaction, removeReaction } from "@/lib/api";
import { useI18n, getLocale } from "@/i18n";
import { Plus } from "lucide-react";

interface Props {
  postId: string;
  initialReactions: Record<string, number>;
}

export default function Reactions({ postId, initialReactions }: Props) {
  const t = useI18n();
  const [reactions, setReactions] = useState<Record<string, number>>(initialReactions);
  const [myEmoji, setMyEmoji] = useState<string | null>(() => getMyReaction(postId));
  const [pickerOpen, setPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  // Close picker on Escape
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [pickerOpen]);

  const handlePick = useCallback(
    async (emoji: string) => {
      if (emoji === myEmoji) {
        // Toggle off
        setMyEmoji(null);
        clearMyReaction(postId);
        setReactions((prev) => {
          const next = { ...prev };
          if (next[emoji] > 1) {
            next[emoji] -= 1;
          } else {
            delete next[emoji];
          }
          return next;
        });
        setPickerOpen(false);
        try {
          const result = await removeReaction(postId);
          setReactions(result.reactions);
        } catch { /* revert on error is acceptable */ }
      } else {
        // Set or switch
        const oldEmoji = myEmoji;
        setMyEmoji(emoji);
        setMyReaction(postId, emoji);
        setReactions((prev) => {
          const next = { ...prev };
          // Remove old
          if (oldEmoji && next[oldEmoji]) {
            if (next[oldEmoji] > 1) {
              next[oldEmoji] -= 1;
            } else {
              delete next[oldEmoji];
            }
          }
          // Add new
          next[emoji] = (next[emoji] || 0) + 1;
          return next;
        });
        setPickerOpen(false);
        try {
          const result = await setReaction(postId, emoji);
          setReactions(result.reactions);
        } catch { /* optimistic update stands */ }
      }
    },
    [postId, myEmoji]
  );

  // Sort badges by count descending
  const badges = Object.entries(reactions)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div ref={containerRef} className="relative mt-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {badges.map(([emoji, count]) => (
          <button
            key={emoji}
            onClick={() => handlePick(emoji)}
            aria-label={`${emoji} ${count}`}
            aria-pressed={emoji === myEmoji}
            className={`
              flex items-center gap-1 px-2.5 py-1 rounded-full text-sm
              transition-all border
              ${
                emoji === myEmoji
                  ? "border-neon-pink/50 bg-neon-pink/10 text-white"
                  : "border-white/15 text-white/60 hover:border-white/30 hover:bg-white/5"
              }
            `}
          >
            <span className="text-base leading-none">{emoji}</span>
            <span className="text-xs min-w-[1ch] text-center">{count}</span>
          </button>
        ))}

        {/* Add reaction button */}
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          aria-label={t.reactions.add}
          aria-expanded={pickerOpen}
          className={`flex items-center justify-center rounded-full
                     border border-white/15 text-white/40
                     hover:border-white/30 hover:text-white/60 hover:bg-white/5
                     transition-all ${badges.length === 0 ? "gap-1 px-3 h-8" : "w-8 h-8"}`}
        >
          <Plus size={14} />
          {badges.length === 0 && (
            <span className="text-xs">{t.reactions.add}</span>
          )}
        </button>
      </div>

      {/* Emoji picker popover */}
      {pickerOpen && (
        <div className="emoji-picker" role="dialog" aria-label={t.reactions.pickerTitle}>
          <div className="emoji-picker-grid">
            {CURATED_EMOJI.map(({ emoji, label, labelEn }) => {
              const locLabel = getLocale() === "ja" ? label : labelEn;
              return (
                <button
                  key={emoji}
                  onClick={() => handlePick(emoji)}
                  aria-label={locLabel}
                  aria-pressed={emoji === myEmoji}
                  title={locLabel}
                  className="emoji-picker-btn"
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
