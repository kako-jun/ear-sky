import { useState, useCallback, useRef, useEffect } from "react";
import { SubtitleCue } from "@/types";
import { formatTime, parseVideoUrl } from "@/lib/video";
import { useI18n } from "@/i18n";
import YouTubePlayer, { YouTubePlayerHandle, preloadYTApi } from "./YouTubePlayer";
import NiconicoPlayer, { NiconicoPlayerHandle } from "./NiconicoPlayer";
import SoundCloudPlayer, { SoundCloudPlayerHandle } from "./SoundCloudPlayer";
import Subtitle from "./Subtitle";
import { Play, Loader2 } from "lucide-react";

interface Props {
  videoUrl: string;
  startSec: number;
  endSec: number;
  cues: SubtitleCue[];
  autoExpand?: boolean;
  stoppable?: boolean;
  onCueReached?: () => void;
  onPlay?: () => void;
}

/**
 * Shared video player + karaoke subtitle component.
 *
 * All platforms use mount-on-click + autoplay:
 * - YouTube: autoplay:1 in playerVars, API script pre-loaded
 * - Niconico: autoplay=1 + from={sec} in URL, timer on iframe load
 * - SoundCloud: auto_play=true + seekTo on READY
 *
 * Interaction overlay appears only after hasPlayed, so if autoplay
 * is blocked the user can click the platform's native play button.
 */
export default function VideoSegment({
  videoUrl,
  startSec,
  endSec,
  cues,
  autoExpand = false,
  stoppable = false,
  onCueReached,
  onPlay,
}: Props) {
  const t = useI18n();
  const [currentTime, setCurrentTime] = useState(0);
  const [expanded, setExpanded] = useState(autoExpand);
  const [hasPlayed, setHasPlayed] = useState(false);
  const cueReachedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const ytRef = useRef<YouTubePlayerHandle>(null);
  const nicoRef = useRef<NiconicoPlayerHandle>(null);
  const scRef = useRef<SoundCloudPlayerHandle>(null);

  const parsed = parseVideoUrl(videoUrl);

  // Pre-load YouTube API script (no iframe)
  useEffect(() => {
    if (parsed?.platform !== "youtube") return;
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { preloadYTApi(); io.disconnect(); } },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [parsed?.platform]);

  const handleTimeUpdate = useCallback((t: number) => {
    setCurrentTime(t);
    if (onCueReached && !cueReachedRef.current && cues.length > 0) {
      const lastCue = cues[cues.length - 1];
      const lastCueEnd = lastCue.showAt + lastCue.duration;
      if (t >= lastCueEnd) {
        cueReachedRef.current = true;
        onCueReached();
      }
    }
  }, [cues, onCueReached]);

  const handlePlaying = useCallback(() => {
    setHasPlayed(true);
    onPlay?.();
  }, [onPlay]);

  const handleSegmentEnd = useCallback(() => {
    setExpanded(false);
  }, []);

  const handlePlayClick = useCallback(() => {
    setExpanded(true);
  }, []);

  const activeCues = hasPlayed ? cues : [];

  if (!parsed) return null;

  const hasPlayer = parsed.platform !== "other";

  const playerProps = {
    startSec,
    endSec,
    onTimeUpdate: handleTimeUpdate,
    onPlaying: handlePlaying,
    onSegmentEnd: handleSegmentEnd,
  };

  return (
    <div ref={rootRef}>
      {hasPlayer && expanded && (
        <div className="relative">
          {parsed.platform === "youtube" && (
            <YouTubePlayer ref={ytRef} videoId={parsed.videoId} {...playerProps} />
          )}
          {parsed.platform === "niconico" && (
            <NiconicoPlayer ref={nicoRef} videoId={parsed.videoId} {...playerProps} />
          )}
          {parsed.platform === "soundcloud" && (
            <SoundCloudPlayer ref={scRef} trackUrl={parsed.videoId} {...playerProps} />
          )}

          {/* Spinner + interaction overlay: skip for Niconico.
             Niconico's autoplay is unreliable and postMessage control doesn't work,
             so the user may need to click Niconico's native play button. */}
          {!hasPlayed && parsed.platform !== "niconico" && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-lg pointer-events-none">
              <Loader2 size={36} className="animate-spin text-white/70" />
            </div>
          )}

          {hasPlayed && parsed.platform !== "niconico" && (
            <div
              onClick={stoppable ? () => setExpanded(false) : undefined}
              className={`absolute inset-0 z-10 rounded-lg ${stoppable ? "cursor-pointer" : ""}`}
              role={stoppable ? "button" : undefined}
              aria-label={stoppable ? "Stop" : undefined}
            />
          )}
          <Subtitle cues={activeCues} currentTime={currentTime} />
        </div>
      )}

      {parsed.platform === "other" && expanded && (
        <div className="relative">
          {(() => {
            let safeHref: string | null = null;
            try {
              const u = new URL(parsed.videoId);
              if (u.protocol === "https:" || u.protocol === "http:") safeHref = u.href;
            } catch { /* invalid */ }
            return (
              <div className="py-6 bg-black/30 flex items-center justify-center text-white/50 text-sm">
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
        </div>
      )}

      {!expanded && (
        <button
          onClick={handlePlayClick}
          aria-label={t.postCard.play}
          className="relative w-full hover:opacity-90 transition-opacity
                     focus-visible:outline-2 focus-visible:outline-neon-blue"
        >
          {parsed.platform === "youtube" ? (
            <img
              src={`https://img.youtube.com/vi/${parsed.videoId}/mqdefault.jpg`}
              alt=""
              className="w-full aspect-video object-cover rounded-lg"
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-video bg-black/30 rounded-lg" />
          )}
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 text-white/80 rounded-lg">
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
