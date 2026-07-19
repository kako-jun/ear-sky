import { ExternalLink } from "lucide-react";
import type { useI18n } from "@/i18n";
import { ClearableInput, fieldId } from "./FormPrimitives";

interface UrlSectionProps {
  t: ReturnType<typeof useI18n>;
  url: string;
  parsed: unknown;
  onUrlChange: (value: string) => void;
}

export function UrlSection({ t, url, parsed, onUrlChange }: UrlSectionProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={fieldId("url")} className="block text-sm text-white/60">{t.editor.urlLabel}</label>
      <ClearableInput
        id={fieldId("url")}
        type="url"
        value={url}
        onChange={(event) => onUrlChange(event.target.value)}
        placeholder={t.editor.urlPlaceholder}
        className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white
                   placeholder:text-white/30 focus:border-neon-blue/50 focus-visible:outline-2 focus-visible:outline-neon-blue"
      />
      {url && !parsed && (
        <p className="text-xs text-red-400">{t.editor.urlInvalid}</p>
      )}
      {!parsed && (
        <div className="flex items-center gap-6 text-[11px] text-white/40">
          <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer"
             className="hover:text-white/50 transition-colors inline-flex items-center gap-0.5">
            YouTube <ExternalLink size={9} />
          </a>
          <a href="https://www.nicovideo.jp" target="_blank" rel="noopener noreferrer"
             className="hover:text-white/50 transition-colors inline-flex items-center gap-0.5">
            niconico <ExternalLink size={9} />
          </a>
          <a href="https://soundcloud.com" target="_blank" rel="noopener noreferrer"
             className="hover:text-white/50 transition-colors inline-flex items-center gap-0.5">
            SoundCloud <ExternalLink size={9} />
          </a>
        </div>
      )}
    </div>
  );
}
