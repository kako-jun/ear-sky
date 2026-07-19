import { Plus, X } from "lucide-react";
import type { useI18n } from "@/i18n";
import DualRangeSlider from "@/components/DualRangeSlider";
import type { CueInput } from "./types";
import { ClearableInput, OptionalLabel, SectionHeader, fieldId } from "./FormPrimitives";

interface SubtitleSectionProps {
  t: ReturnType<typeof useI18n>;
  cues: CueInput[];
  maxCues: number;
  videoDuration: number;
  onUpdateCue: (index: number, patch: Partial<CueInput>) => void;
  onAddCue: () => void;
  onRemoveCue: (index: number) => void;
}

export function SubtitleSection({
  t,
  cues,
  maxCues,
  videoDuration,
  onUpdateCue,
  onAddCue,
  onRemoveCue,
}: SubtitleSectionProps) {
  return (
    <>
      <SectionHeader text={t.editor.sectionSubtitle} />
      <p className="text-xs text-white/30 -mt-2 mb-3">{t.editor.cueHint}</p>

      {cues.map((cue, index) => (
        <div key={cue.id} className="space-y-3 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">
              {t.editor.cueLabel} {cues.length > 1 ? index + 1 : ""}
            </span>
            {cues.length > 1 && (
              <button
                onClick={() => onRemoveCue(index)}
                className="text-xs text-white/30 hover:text-red-400 flex items-center gap-0.5
                           min-w-[44px] min-h-[44px] justify-center
                           focus-visible:outline-2 focus-visible:outline-neon-blue"
                aria-label={t.editor.removeCue}
              >
                <X size={12} />
                {t.editor.removeCue}
              </button>
            )}
          </div>

          <DualRangeSlider
            min={index === 0 ? 0 : cues[0].startSec}
            max={videoDuration}
            startVal={cue.startSec}
            endVal={cue.endSec}
            onStartChange={(value) => onUpdateCue(index, { startSec: value })}
            onEndChange={(value) => onUpdateCue(index, { endSec: value })}
          />

          <div className="space-y-1">
            <label htmlFor={fieldId(`misheard-${index}`)} className="block text-sm text-white/60">{t.editor.misheardLabel}</label>
            <ClearableInput
              id={fieldId(`misheard-${index}`)}
              type="text"
              value={cue.text}
              onChange={(event) => onUpdateCue(index, { text: event.target.value })}
              maxLength={30}
              placeholder={t.editor.misheardPlaceholder}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-lg
                         placeholder:text-white/30 focus:border-neon-pink/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor={fieldId(`original-${index}`)} className="block text-sm text-white/60">
              {t.editor.originalLabel}
              <OptionalLabel text={t.editor.optional} />
            </label>
            <ClearableInput
              id={fieldId(`original-${index}`)}
              type="text"
              value={cue.originalText}
              onChange={(event) => onUpdateCue(index, { originalText: event.target.value })}
              placeholder=""
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                         placeholder:text-white/30 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
            />
          </div>
        </div>
      ))}

      {cues.length < maxCues && (
        <button
          onClick={onAddCue}
          className="w-full py-2.5 rounded-lg border border-dashed border-white/15 text-white/40
                     hover:border-white/30 hover:text-white/60 transition-all flex items-center justify-center gap-1.5
                     focus-visible:outline-2 focus-visible:outline-neon-blue"
        >
          <Plus size={14} />
          {t.editor.addCue}
        </button>
      )}
    </>
  );
}
