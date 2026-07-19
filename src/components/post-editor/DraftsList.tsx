import { useEffect, useState } from "react";
import { getAllDrafts } from "@/lib/storage";
import { useI18n } from "@/i18n";

interface DraftsListProps {
  onLoad: (draft: ReturnType<typeof getAllDrafts>[number]) => void;
  onDelete: (id: string) => void;
}

export function DraftsList({ onLoad, onDelete }: DraftsListProps) {
  const t = useI18n();
  const [drafts, setDrafts] = useState<ReturnType<typeof getAllDrafts>>([]);

  useEffect(() => {
    setDrafts(getAllDrafts());
  }, []);

  if (drafts.length === 0) {
    return (
      <p className="text-xs text-white/30 text-center py-3">
        {t.editor.noDrafts}
      </p>
    );
  }

  return (
    <div className="space-y-2 p-3 bg-black/20 rounded-lg border border-white/10">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className="flex items-center justify-between gap-2 text-sm"
        >
          <button
            onClick={() => onLoad(draft)}
            className="text-white/60 hover:text-white hover:bg-white/5 truncate text-left flex-1
                       rounded px-2 py-1.5 cursor-pointer transition-colors"
          >
            <span className="underline underline-offset-2 decoration-white/20">
              {draft.data.misheardText || draft.data.videoUrl || "(untitled)"}
            </span>
            <span className="text-white/30 text-xs ml-2">
              {draft.updatedAt.slice(0, 10)}
            </span>
          </button>
          <button
            onClick={() => {
              onDelete(draft.id);
              setDrafts((prev) => prev.filter((item) => item.id !== draft.id));
            }}
            className="text-white/30 hover:text-red-400 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center
                       focus-visible:outline-2 focus-visible:outline-neon-blue"
            aria-label={t.editor.delete}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
