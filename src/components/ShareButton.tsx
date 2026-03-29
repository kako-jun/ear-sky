import { useI18n } from "@/i18n";
import { Share2 } from "lucide-react";

export default function ShareButton({ onShare }: { onShare: () => void }) {
  const t = useI18n();
  return (
    <div className="flex justify-end mt-1">
      <button
        onClick={onShare}
        className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50
                   min-h-[44px] px-3
                   focus-visible:outline-2 focus-visible:outline-neon-blue"
      >
        <Share2 size={12} />{t.share}
      </button>
    </div>
  );
}
