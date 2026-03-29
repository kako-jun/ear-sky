import { useState, useEffect, useCallback, useRef } from "react";
import type { Pickup, PickupEntry, BanterLine } from "@/types";
import { useI18n } from "@/i18n";
import VideoSegment from "@/components/VideoSegment";
import { Mic, Wine, ChevronDown, ChevronUp, Share2 } from "lucide-react";

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? key));
}

export default function PickupCorner() {
  const t = useI18n();
  const [allIds, setAllIds] = useState<string[]>([]);
  const [currentPickup, setCurrentPickup] = useState<Pickup | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archivePickups, setArchivePickups] = useState<Map<string, Pickup>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/pickups/index.json");
        const ids: string[] = await res.json();
        setAllIds(ids);
        if (ids.length === 0) {
          setLoading(false);
          return;
        }
        const latest = ids[ids.length - 1];
        const dataRes = await fetch(`/pickups/${latest}.json`);
        setCurrentPickup(await dataRes.json());
      } catch {
        // static file missing
      }
      setLoading(false);
    })();
  }, []);

  const loadedRef = useRef(new Set<string>());
  const loadArchivePickup = useCallback((id: string) => {
    if (loadedRef.current.has(id)) return;
    loadedRef.current.add(id);
    fetch(`/pickups/${id}.json`)
      .then((res) => res.json())
      .then((data: Pickup) => {
        setArchivePickups((prev) => new Map(prev).set(id, data));
      })
      .catch(() => {});
  }, []);

  const handleArchiveToggle = useCallback(() => {
    const next = !archiveOpen;
    setArchiveOpen(next);
    if (next) {
      const pastIds = allIds.slice(0, -1).reverse();
      pastIds.forEach(loadArchivePickup);
    }
  }, [archiveOpen, allIds, loadArchivePickup]);

  if (loading) {
    return <p className="text-center text-white/40 py-8">{t.pickup.loading}</p>;
  }

  if (!currentPickup || currentPickup.picks.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Mic size={48} className="mx-auto text-white/20" />
        <p className="text-white/40">{t.pickup.empty}</p>
        <p className="text-xs text-white/25">{t.pickup.emptyHint}</p>
      </div>
    );
  }

  const pastIds = allIds.slice(0, -1).reverse();

  return (
    <div className="space-y-6">
      <PickupContent pickup={currentPickup} />

      {pastIds.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={handleArchiveToggle}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-white/30 hover:text-white/50 transition-colors
                       focus-visible:outline-2 focus-visible:outline-neon-blue"
          >
            {archiveOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {t.pickup.archive} ({pastIds.length})
          </button>

          {archiveOpen && (
            <div className="space-y-8">
              {pastIds.map((id) => {
                const p = archivePickups.get(id);
                if (!p) return <p key={id} className="text-center text-white/20 text-xs py-4">{t.pickup.loading}</p>;
                return <PickupContent key={id} pickup={p} />;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PickupContent({ pickup }: { pickup: Pickup }) {
  const t = useI18n();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold neon-text-blue flex items-center justify-center gap-2">
          <Mic size={18} aria-hidden="true" />
          {pickup.title}
        </h2>
        <p className="text-xs text-white/30">{t.pickup.updated} {pickup.publishedAt}</p>
      </div>

      {pickup.picks.map((pick, i) => (
        <PickupItem key={i} pick={pick} index={i} pickupId={pickup.id} />
      ))}

      <div className="text-center pt-2 pb-1">
        <p className="text-xs text-white/25">— {t.pickup.closing} —</p>
      </div>
    </div>
  );
}

function PickupItem({ pick, index, pickupId }: { pick: PickupEntry; index: number; pickupId: string }) {
  const t = useI18n();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const pickupCues = [{
    text: pick.misheardText,
    originalText: pick.originalText,
    showAt: pick.startSec,
    duration: pick.endSec - pick.startSec,
  }];

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}#pickup-${pickupId}-${index}`;
    if (navigator.share) {
      navigator.share({
        title: `"${pick.misheardText}" — ${pick.artistName}`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const introText = interpolate(t.pickup.intro, {
    artistName: pick.artistName,
    songTitle: pick.songTitle,
    year: pick.year,
  });

  return (
    <article className="space-y-3">
      {index > 0 && (
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 border-t border-white/10" />
          <span className="text-white/15 text-xs">&#9834;</span>
          <div className="flex-1 border-t border-white/10" />
        </div>
      )}

      {/* Intro: master introduces the song */}
      <div className="flex items-start gap-2">
        <div
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-neon-blue/20 text-neon-blue"
          aria-hidden="true"
        >
          <Wine size={14} />
        </div>
        <div className="max-w-[80%] rounded-lg rounded-tl-none px-3 py-2 text-sm leading-relaxed bg-neon-blue/10 text-white/80">
          {introText}
        </div>
      </div>

      {/* Video player — same as a regular post */}
      <VideoSegment
        videoUrl={pick.videoUrl}
        startSec={pick.startSec}
        endSec={pick.endSec}
        cues={pickupCues}
        autoExpand
        onCueReached={() => setRevealed(true)}
      />

      {/* Misheard text + banter — auto-revealed on playback */}
      {revealed && (
        <div className="space-y-3 animate-fade-in">
          <div className="neon-border rounded-lg p-3 space-y-1 text-center">
            <p className="text-lg font-bold text-white/90">
              &ldquo;{pick.misheardText}&rdquo;
            </p>
            {pick.originalText && (
              <p className="text-xs text-white/40">{pick.originalText}</p>
            )}
          </div>

          {/* Banter */}
          <div className="space-y-2 pl-2">
            {pick.banter.map((line, j) => (
              <BanterBubble key={j} line={line} />
            ))}
          </div>

          {/* Share */}
          <div className="flex justify-end">
            <button
              onClick={handleShare}
              className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50
                         min-h-[44px] px-3
                         focus-visible:outline-2 focus-visible:outline-neon-blue"
            >
              <Share2 size={12} />
              {copied ? t.pickup.copied : t.share}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function BanterBubble({ line }: { line: BanterLine }) {
  const isMaster = line.speaker === "master";

  return (
    <div className={`flex items-start gap-2 ${isMaster ? "" : "flex-row-reverse"}`}>
      <div
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center
          ${isMaster ? "bg-neon-blue/20 text-neon-blue" : "bg-neon-yellow/20 text-neon-yellow"}`}
        aria-hidden="true"
      >
        {isMaster ? <Wine size={14} /> : <BeerMugIcon size={14} />}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed
          ${isMaster
            ? "bg-neon-blue/10 text-white/80 rounded-tl-none"
            : "bg-neon-yellow/10 text-white/80 rounded-tr-none"
          }`}
      >
        {line.text}
      </div>
    </div>
  );
}

function BeerMugIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Mug body */}
      <path d="M5 6h10v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6z" />
      {/* Handle */}
      <path d="M15 9h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2" />
      {/* Foam */}
      <path d="M5 6c0-1 .5-2 2.5-2s2 1.2 2.5 2c.5-.8 1-2 2.5-2s2.5 1 2.5 2" />
    </svg>
  );
}
