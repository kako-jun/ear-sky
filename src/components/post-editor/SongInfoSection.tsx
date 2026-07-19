import { LANGUAGES, MAX_TAGS, VALID_TAGS } from "@/shared/domain";
import type { useI18n } from "@/i18n";
import { ClearableInput, OptionalLabel, SectionHeader, fieldId } from "./FormPrimitives";

interface SongInfoSectionProps {
  t: ReturnType<typeof useI18n>;
  locale: string;
  artistName: string;
  songTitle: string;
  sourceLang: string;
  targetLang: string;
  era: string;
  tags: string[];
  onArtistNameChange: (value: string) => void;
  onSongTitleChange: (value: string) => void;
  onSourceLangChange: (value: string) => void;
  onTargetLangChange: (value: string) => void;
  onEraChange: (value: string) => void;
  onTagsChange: (updater: (previous: string[]) => string[]) => void;
}

export function SongInfoSection({
  t,
  locale,
  artistName,
  songTitle,
  sourceLang,
  targetLang,
  era,
  tags,
  onArtistNameChange,
  onSongTitleChange,
  onSourceLangChange,
  onTargetLangChange,
  onEraChange,
  onTagsChange,
}: SongInfoSectionProps) {
  return (
    <>
      <SectionHeader text={t.editor.sectionSong} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor={fieldId("artist")} className="block text-sm text-white/60">{t.editor.artistLabel}</label>
          <ClearableInput
            id={fieldId("artist")}
            type="text"
            value={artistName}
            onChange={(event) => onArtistNameChange(event.target.value)}
            placeholder="Queen"
            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                       placeholder:text-white/30 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={fieldId("song")} className="block text-sm text-white/60">{t.editor.songLabel}</label>
          <ClearableInput
            id={fieldId("song")}
            type="text"
            value={songTitle}
            onChange={(event) => onSongTitleChange(event.target.value)}
            placeholder="Bohemian Rhapsody"
            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                       placeholder:text-white/30 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor={fieldId("source-lang")} className="block text-sm text-white/60">{t.editor.sourceLangLabel}</label>
          <select
            id={fieldId("source-lang")}
            value={sourceLang}
            onChange={(event) => onSourceLangChange(event.target.value)}
            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                       focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
          >
            {LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>{language.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor={fieldId("target-lang")} className="block text-sm text-white/60">{t.editor.targetLangLabel}</label>
          <select
            id={fieldId("target-lang")}
            value={targetLang}
            onChange={(event) => onTargetLangChange(event.target.value)}
            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                       focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
          >
            {LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>{language.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor={fieldId("era")} className="block text-sm text-white/60">
          {t.editor.eraLabel}
          <OptionalLabel text={t.editor.optional} />
        </label>
        <ClearableInput
          id={fieldId("era")}
          type="text"
          value={era}
          onChange={(event) => onEraChange(event.target.value)}
          placeholder={t.editor.eraPlaceholder}
          maxLength={20}
          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                     placeholder:text-white/30 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm text-white/60">
          {t.editor.tagsLabel}
          <OptionalLabel text={t.editor.tagsHint} />
        </label>
        <div className="flex flex-wrap gap-2">
          {VALID_TAGS.map((tag) => {
            const selected = tags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  onTagsChange((previous) =>
                    selected
                      ? previous.filter((item) => item !== tag.id)
                      : previous.length < MAX_TAGS
                        ? [...previous, tag.id]
                        : previous
                  );
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                  ${selected
                    ? "bg-neon-pink/20 text-neon-pink border border-neon-pink/40"
                    : tags.length >= MAX_TAGS
                      ? "text-white/25 border border-white/8 cursor-default"
                      : "text-white/40 border border-white/15 hover:text-white/60 hover:border-white/25"
                  }`}
              >
                {locale === "ja" ? tag.labelJa : tag.labelEn}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
