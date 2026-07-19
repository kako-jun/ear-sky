import { Save, Send } from "lucide-react";
import type { useI18n } from "@/i18n";

interface EditorActionsProps {
  t: ReturnType<typeof useI18n>;
  canSave: boolean;
  canSubmit: boolean;
  submitting: boolean;
  savedMsg: string;
  onSaveDraft: () => void;
  onSubmit: () => void;
}

export function EditorActions({
  t,
  canSave,
  canSubmit,
  submitting,
  savedMsg,
  onSaveDraft,
  onSubmit,
}: EditorActionsProps) {
  return (
    <>
      <div className="flex gap-3 pt-2">
        <button
          onClick={onSaveDraft}
          disabled={!canSave}
          className="flex-1 py-3 rounded-lg border border-white/20 text-white/60
                     hover:border-white/40 hover:text-white/80 transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Save size={14} className="inline mr-1" />{t.editor.saveDraft}
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit || submitting}
          className="flex-1 py-3 rounded-lg bg-neon-pink text-white font-bold
                     hover:brightness-110 active:scale-[0.98] transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed
                     focus-visible:outline-2 focus-visible:outline-neon-blue"
        >
          <Send size={14} className="inline mr-1" />{submitting ? t.editor.submitting : t.editor.submit}
        </button>
      </div>

      {savedMsg && (
        <p className="text-center text-sm text-neon-blue animate-pulse">
          {savedMsg}
        </p>
      )}
    </>
  );
}
