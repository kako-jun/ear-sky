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
  /** Start with player expanded */
  autoExpand?: boolean;
  /** Allow tap-to-stop during playback (editor preview only) */
  stoppable?: boolean;
  /** Called when playback enters a cue region */
  onCueReached?: () => void;
  /** Called every time playback starts */
  onPlay?: () => void;
}

/**
 * Shared video player + karaoke subtitle component.
 *
 * Player iframes are mounted ONLY when the user clicks play (expanded=true).
 * Pre-mounting multiple iframes simultaneously causes YouTube API initialization
 * failures (postMessage origin mismatch, concurrent player limits). Hiding
 * iframes (display:none, clip-path, visibility:hidden) breaks JS callbacks.
 *
 * Instead, only the YouTube API *script* is pre-loaded (via IntersectionObserver).
 * When the user clicks, the iframe is created with autoplay:1. The browser's
 * user activation (5s window after click) allows autoplay inside the iframe.
 *
 * If autoplay is blocked (very restrictive browsers), no interaction overlay
 * exists until hasPlayed, so the user can click YouTube's native play button.
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

  // Pre-load the YouTube API script (no iframe) when the card nears the viewport
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

  // Keep subtitles visible after segment ends (last cue stays on screen)
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
      {/* Player: mounted only when expanded (user clicked play).
         YouTube uses autoplay:1. Niconico/SoundCloud play on mount. */}
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

          {/* Loading indicator before playback starts */}
          {!hasPlayed && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-lg pointer-events-none">
              <Loader2 size={36} className="animate-spin text-white/70" />
            </div>
          )}

          {/* Interaction overlay — only after playback starts.
             Before hasPlayed, iframe is unblocked so YouTube's native
             play button remains clickable as autoplay fallback. */}
          {hasPlayed && (
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

      {/* "other" platform: mount/unmount */}
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

      {/* Play button — shown when not expanded */}
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
