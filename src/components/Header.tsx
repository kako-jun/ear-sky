import { useI18n, useI18nState } from "@/i18n";
import { Globe } from "lucide-react";

export default function Header() {
  const t = useI18n();
  const { locale, setLocale, availableLocales } = useI18nState();

  const cycleLocale = () => {
    const idx = availableLocales.findIndex((l) => l.code === locale);
    const next = availableLocales[(idx + 1) % availableLocales.length];
    setLocale(next.code);
  };

  return (
    <header className="text-center pt-8 pb-4 px-4 relative">
      {/* Language toggle — top right */}
      <button
        onClick={cycleLocale}
        className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded
                   text-xs text-white/40 hover:text-white/70 hover:bg-white/5
                   transition-colors
                   focus-visible:outline-2 focus-visible:outline-neon-blue"
        aria-label="Switch language"
      >
        <Globe size={14} />
        <span className="font-bold">{locale.toUpperCase()}</span>
      </button>

      {/* Subtle neon glow behind title */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 w-64 h-16 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse, #ff2d78 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="flex items-center justify-center gap-3 mb-2">
        <img src="/icon-192.png" alt="" width={48} height={48} className="rounded-lg opacity-80" aria-hidden="true" />
        <h1 className="text-2xl md:text-3xl font-bold neon-text tracking-wider">
          Ear in the Sky Diamond
        </h1>
      </div>
      {t.header.alias && (
        <div className="flex items-center justify-center gap-3 mt-1">
          <div className="w-12 h-px bg-gradient-to-l from-white/30 to-transparent" aria-hidden="true" />
          <p className="text-xs text-white/40 tracking-widest">{t.header.alias}</p>
          <div className="w-12 h-px bg-gradient-to-r from-white/30 to-transparent" aria-hidden="true" />
        </div>
      )}
      <p className="text-sm text-white/50 mt-3">
        {t.header.subtitle}
      </p>

      {/* Decorative neon line */}
      <div className="mt-4 mx-auto max-w-xs h-px bg-gradient-to-r from-transparent via-neon-pink/40 to-transparent" aria-hidden="true" />
    </header>
  );
}
