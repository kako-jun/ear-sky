import { useState, useEffect } from "react";
import { useI18n, useI18nState } from "@/i18n";
import { Globe } from "lucide-react";

const SHRINK_AT = 80;
const EXPAND_AT = 40;

export function useShrunk() {
  const [shrunk, setShrunk] = useState(false);
  useEffect(() => {
    const onScroll = () =>
      setShrunk((prev) =>
        prev ? window.scrollY > EXPAND_AT : window.scrollY > SHRINK_AT,
      );
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return shrunk;
}

export default function Header({ shrunk }: { shrunk: boolean }) {
  const t = useI18n();
  const { locale, setLocale, availableLocales } = useI18nState();
  const cycleLocale = () => {
    const idx = availableLocales.findIndex((l) => l.code === locale);
    const next = availableLocales[(idx + 1) % availableLocales.length];
    setLocale(next.code);
  };

  return (
    <header
      className={`text-center px-4 relative ${shrunk ? "pt-2 pb-1" : "pt-8 pb-4"}`}
    >
      {/* Language toggle — top right */}
      <button
        onClick={cycleLocale}
        className={`absolute right-3 flex items-center gap-1 px-2 py-1 rounded
                   text-xs text-white/40 hover:text-white/70 hover:bg-white/5
                   focus-visible:outline-2 focus-visible:outline-neon-blue
                   ${shrunk ? "top-1.5" : "top-3"}`}
        aria-label="Switch language"
      >
        <Globe size={14} />
        <span className="font-bold">{locale.toUpperCase()}</span>
      </button>

      {/* Subtle neon glow behind title */}
      <div
        className={`absolute top-4 left-1/2 -translate-x-1/2 w-64 h-16 rounded-full blur-3xl pointer-events-none
          ${shrunk ? "opacity-0" : "opacity-20"}`}
        style={{ background: "radial-gradient(ellipse, #ff2d78 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`inline-flex items-center justify-center cursor-pointer
                   hover:opacity-80
                   focus-visible:outline-2 focus-visible:outline-neon-blue focus-visible:outline-offset-2
                   ${shrunk ? "gap-2 mb-0" : "gap-3 mb-2"}`}
      >
        <img
          src="/icon-192.png"
          alt=""
          className={`rounded-lg opacity-80 ${shrunk ? "w-6 h-6" : "w-12 h-12"}`}
          aria-hidden="true"
        />
        <h1
          className={`font-bold neon-text tracking-wider
            ${shrunk ? "text-sm" : "text-2xl md:text-3xl"}`}
        >
          Ear in the Sky Diamond
        </h1>
      </button>

      {/* Alias, subtitle, decorative line — always rendered, clipped when shrunk */}
      <div className={shrunk ? "max-h-0 overflow-hidden" : ""}>
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
      </div>
    </header>
  );
}
