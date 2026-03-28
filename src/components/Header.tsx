import { useI18n } from "@/i18n";

export default function Header() {
  const t = useI18n();

  return (
    <header className="text-center pt-8 pb-4 px-4 relative">
      {/* Subtle neon glow behind title */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 w-64 h-16 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse, #ff2d78 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="flex items-center justify-center gap-3 mb-2">
        <img src="/icon-192.png" alt="" width={36} height={36} className="rounded-lg opacity-80" aria-hidden="true" />
        <h1 className="text-2xl md:text-3xl font-bold neon-text tracking-wider">
          Ear in the Sky Diamond
        </h1>
      </div>
      {t.header.alias && (
        <p className="text-xs text-white/40 tracking-widest">
          {t.header.alias}
        </p>
      )}
      <p className="text-sm text-white/50 mt-3">
        {t.header.subtitle}
      </p>

      {/* Decorative neon line */}
      <div className="mt-4 mx-auto max-w-xs h-px bg-gradient-to-r from-transparent via-neon-pink/40 to-transparent" aria-hidden="true" />
    </header>
  );
}
