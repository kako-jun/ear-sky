import { useState, useCallback, useRef } from "react";
import { SubtitleCue } from "@/types";
import { formatTime, parseVideoUrl } from "@/lib/video";
import { useI18n } from "@/i18n";
import YouTubePlayer from "./YouTubePlayer";
import NiconicoPlayer from "./NiconicoPlayer";
import Subtitle from "./Subtitle";
import { Play } from "lucide-react";

interface Props {
  videoUrl: string;
  startSec: number;
  endSec: number;
  cues: SubtitleCue[];
  /** Start with player expanded */
  autoExpand?: boolean;
  /** Called when playback enters a cue region */
  onCueReached?: () => void;
}

/**
 * Shared video player + karaoke subtitle component.
 * Used by PostCard, PickupCorner, and anywhere a video segment is displayed.
 */
export default function VideoSegment({
  videoUrl,
  startSec,
  endSec,
  cues,
  autoExpand = false,
  onCueReached,
}: Props) {
  const t = useI18n();
  const [currentTime, setCurrentTime] = useState(0);
  const [expanded, setExpanded] = useState(autoExpand);
  const [isPlaying, setIsPlaying] = useState(false);
  const cueReachedRef = useRef(false);

  const parsed = parseVideoUrl(videoUrl);

  const handleTimeUpdate = useCallback((t: number) => {
    setCurrentTime(t);
    if (onCueReached && !cueReachedRef.current) {
      for (const cue of cues) {
        if (t >= cue.showAt && t < cue.showAt + cue.duration) {
          cueReachedRef.current = true;
          onCueReached();
          break;
        }
      }
    }
  }, [cues, onCueReached]);

  const handleYTStateChange = useCallback((state: number) => {
    setIsPlaying(state === 1);
  }, []);

  const handleNicoStateChange = useCallback((state: "playing" | "paused" | "ended") => {
    setIsPlaying(state === "playing");
  }, []);

  const activeCues = isPlaying ? cues : [];

  if (!parsed) return null;

  return (
    <div>
      {expanded ? (
        <div>
          {parsed.platform === "youtube" && (
            <YouTubePlayer
              videoId={parsed.videoId}
              startSec={startSec}
              endSec={endSec}
              onTimeUpdate={handleTimeUpdate}
              onStateChange={handleYTStateChange}
            />
          )}
          {parsed.platform === "niconico" && (
            <NiconicoPlayer
              videoId={parsed.videoId}
              startSec={startSec}
              endSec={endSec}
              onTimeUpdate={handleTimeUpdate}
              onStateChange={handleNicoStateChange}
            />
          )}
          {parsed.platform === "other" && (() => {
            let safeHref: string | null = null;
            try {
              const u = new URL(parsed.videoId);
              if (u.protocol === "https:" || u.protocol === "http:") safeHref = u.href;
            } catch { /* invalid */ }
            return (
              <div className="py-6 bg-black/30 flex items-center justify-center text-white/40 text-sm">
                {safeHref ? (
                  <a href={safeHref} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60">
                    {formatTime(startSec)}〜{formatTime(endSec)} →
                  </a>
                ) : (
                  <span>{formatTime(startSec)}〜{formatTime(endSec)}</span>
                )}
              </div>
            );
          })()}
          <Subtitle cues={activeCues} currentTime={currentTime} />
          {/* DEBUG: remove before release */}
          {isPlaying && (
            <div className="px-2 py-1 text-[10px] font-mono text-white/30 bg-black/60 rounded-b space-y-0.5">
              <div>t={currentTime.toFixed(1)}s</div>
              {cues.map((cue, i) => {
                const elapsed = currentTime - cue.showAt;
                const progress = cue.duration > 0 ? Math.min(1, Math.max(0, elapsed / cue.duration)) : 0;
                const active = elapsed >= 0 && elapsed < cue.duration;
                return (
                  <div key={i} className={active ? "text-neon-yellow" : ""}>
                    cue{i}: {cue.showAt.toFixed(1)}–{(cue.showAt + cue.duration).toFixed(1)}s
                    {" "}p={progress.toFixed(2)}
                    {active ? " ▶" : elapsed >= cue.duration ? " ✓" : " ·"}
                    {" "}&quot;{cue.text}&quot;
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          aria-label={t.postCard.play}
          className="relative w-full hover:opacity-90 transition-opacity
                     focus-visible:outline-2 focus-visible:outline-neon-blue"
        >
          {parsed.platform === "youtube" ? (
            <img
              src={`https://img.youtube.com/vi/${parsed.videoId}/mqdefault.jpg`}
              alt=""
              className="w-full aspect-video object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-video bg-black/30" />
          )}
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 text-white/80">
            <Play size={36} />
            <span className="text-xs text-white/60">
              {formatTime(startSec)} 〜 {formatTime(endSec)}
            </span>
          </div>
        </button>
      )}

    </div>
  );
}
