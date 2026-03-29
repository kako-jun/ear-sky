import { useI18n } from "@/i18n";
import { PAGE_SIZE } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Paginator({ page, total, onPage }: {
  page: number; total: number; onPage: (page: number) => void;
}) {
  const t = useI18n();
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;

  // Show current page ± 1, plus first and last
  const pages: number[] = [];
  for (let i = 0; i < totalPages; i++) {
    if (i === 0 || i === totalPages - 1 || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 py-3 flex-wrap">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 0}
        className="p-1.5 rounded text-white/40 hover:text-white/70 disabled:opacity-20 disabled:cursor-default transition-colors"
        aria-label={t.feed.prevPage}
      >
        <ChevronLeft size={16} />
      </button>
      {pages.map((p, i) => {
        const prev = i > 0 ? pages[i - 1] : p;
        const rangeStart = p * PAGE_SIZE + 1;
        return (
          <span key={p} className="contents">
            {p - prev > 1 && <span className="text-white/30 text-xs px-1">…</span>}
            <button
              onClick={() => onPage(p)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors min-w-[36px]
                ${page === p
                  ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/40"
                  : "text-white/50 hover:text-white/70 hover:bg-white/5"
                }`}
            >
              {rangeStart}-
            </button>
          </span>
        );
      })}
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages - 1}
        className="p-1.5 rounded text-white/40 hover:text-white/70 disabled:opacity-20 disabled:cursor-default transition-colors"
        aria-label={t.feed.nextPage}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
