import { useI18n } from "@/i18n";

export default function EmptyState({ onPost }: { onPost: () => void }) {
  const t = useI18n();
  return (
    <div className="text-center py-16 space-y-5">
      <img src="/icon-192.png" alt="" width={64} height={64} className="mx-auto rounded-xl opacity-80" aria-hidden="true" />
      <p className="text-white/60 text-lg font-bold">{t.feed.empty}</p>
      <p className="text-white/40 text-sm max-w-xs mx-auto leading-relaxed">
        {t.feed.emptyHint}
      </p>
      <button
        onClick={onPost}
        className="px-6 py-2 rounded-lg bg-neon-pink text-white font-bold
                   hover:brightness-110 transition-all
                   focus-visible:outline-2 focus-visible:outline-neon-blue focus-visible:outline-offset-2"
      >
        {t.feed.emptyAction}
      </button>
    </div>
  );
}
