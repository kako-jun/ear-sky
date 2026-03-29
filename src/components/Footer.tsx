import { useI18n } from "@/i18n";
import { Heart, ExternalLink } from "lucide-react";

export default function Footer() {
  const t = useI18n();

  return (
    <footer className="text-center text-xs text-white/30 py-12 px-4 space-y-4">
      {/* Neon pink divider */}
      <div className="mx-auto max-w-xs h-px bg-gradient-to-r from-transparent via-neon-pink/40 to-transparent mb-6" aria-hidden="true" />

      <p className="text-white/40 font-bold tracking-wider">{t.footer.siteName}</p>
      {t.footer.siteAlias && (
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-px bg-gradient-to-l from-white/20 to-transparent" aria-hidden="true" />
          <p className="text-xs text-white/30 tracking-widest">{t.footer.siteAlias}</p>
          <div className="w-10 h-px bg-gradient-to-r from-white/20 to-transparent" aria-hidden="true" />
        </div>
      )}

      <p className="leading-relaxed text-white/30">
        {t.footer.disclaimer}<br />
        {t.footer.noHosting}
      </p>

      {/* QR code */}
      <div className="pt-2">
        <img
          src="/qr.webp"
          alt="Scan to visit Ear in the Sky Diamond"
          width={96}
          height={96}
          className="mx-auto opacity-40 invert sepia saturate-[5] hue-rotate-[170deg]"
        />
      </div>

      {/* Author & links */}
      <div className="flex items-center justify-center gap-4 text-white/30 pt-2">
        <span>
          {t.footer.madeBy}{" "}
          <a
            href="https://llll-ll.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neon-blue/60 hover:text-neon-blue transition-colors"
          >
            kako-jun
          </a>
        </span>
        <a
          href="https://github.com/kako-jun/ear-sky"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/50 transition-colors flex items-center gap-0.5"
        >
          GitHub <ExternalLink size={10} />
        </a>
      </div>

      {/* Sponsor */}
      <a
        href="https://github.com/sponsors/kako-jun"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full
                   border border-neon-pink/30 text-neon-pink/60
                   hover:border-neon-pink/50 hover:text-neon-pink hover:bg-neon-pink/5
                   transition-all text-xs"
      >
        <Heart size={12} />
        Sponsor
      </a>

      <div className="flex items-center justify-center gap-4 text-white/25 pt-2">
        <span>
          {/* @ts-expect-error nostalgic-counter is a Web Component */}
          <nostalgic-counter id="ear-sky-eaae1797" type="total" format="text" />{" "}{t.footer.visits}
        </span>
        <span>v{__BUILD_DATE__}</span>
      </div>
    </footer>
  );
}
