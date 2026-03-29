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
 * Platform-specific mount strategies:
 *
 * - **YouTube**: mount-on-click + autoplay:1. Pre-mounting multiple iframes
 *   breaks YouTube API (concurrent player limit, postMessage origin errors).
 *   Hiding iframes (display:none, clip-path, visibility) breaks JS callbacks.
 *   YouTube API script is pre-loaded via IntersectionObserver (lightweight).
 *
 * - **Niconico**: pre-mount (IntersectionObserver) + play() on click.
 *   Niconico has no JS callbacks to break — timer is Date.now() based,
 *   control is postMessage fire-and-forget. Pre-mounting is safe.
 *   play() is called synchronously in click handler so the user gesture
 *   propagates via postMessage. Typically 0-1 Niconico videos per page.
 *
 * - **SoundCloud**: mount-on-click + auto_play=true. Widget API works after mount.
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
  const [nicoVisible, setNicoVisible] = useState(autoExpand);
  const cueReachedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const ytRef = useRef<YouTubePlayerHandle>(null);
  const nicoRef = useRef<NiconicoPlayerHandle>(null);
  const scRef = useRef<SoundCloudPlayerHandle>(null);

  const parsed = parseVideoUrl(videoUrl);
  const isNiconico = parsed?.platform === "niconico";

  // YouTube: pre-load API script only (no iframe)
  // Niconico: pre-mount iframe (safe — no JS callbacks to break)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (parsed?.platform === "youtube") {
      const io = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { preloadYTApi(); io.disconnect(); } },
        { rootMargin: "400px" },
      );
      io.observe(el);
      return () => io.disconnect();
    }
    if (parsed?.platform === "niconico") {
      const io = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { setNicoVisible(true); io.disconnect(); } },
        { rootMargin: "200px" },
      );
      io.observe(el);
      return () => io.disconnect();
    }
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
    // Niconico: play() synchronously in click handler — gesture propagates
    if (isNiconico) {
      nicoRef.current?.play();
    }
    setExpanded(true);
  }, [isNiconico]);

  // Keep subtitles visible after segment ends
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

  // Niconico: pre-mounted iframe, covered by thumbnail overlay until click
  const nicoMounted = isNiconico && nicoVisible;
  // YouTube/SoundCloud: mounted only when expanded
  const otherMounted = !isNiconico && hasPlayer && expanded;

  return (
    <div ref={rootRef}>
      {/* Niconico: pre-mounted with display:none. Niconico has no JS callbacks,
         so display:none doesn't break anything — the iframe loads and Niconico's
         player JS initializes while hidden. On click, play() + unhide. */}
      {nicoMounted && (
        <div className={expanded ? "relative" : "hidden"}>
          <NiconicoPlayer ref={nicoRef} videoId={parsed.videoId} {...playerProps} />
          {expanded && hasPlayed && (
            <div
              onClick={stoppable ? () => setExpanded(false) : undefined}
              className={`absolute inset-0 z-10 rounded-lg ${stoppable ? "cursor-pointer" : ""}`}
              role={stoppable ? "button" : undefined}
              aria-label={stoppable ? "Stop" : undefined}
            />
          )}
          {expanded && <Subtitle cues={activeCues} currentTime={currentTime} />}
        </div>
      )}

      {/* YouTube / SoundCloud: mounted only when expanded */}
      {otherMounted && (
        <div className="relative">
          {parsed.platform === "youtube" && (
            <YouTubePlayer ref={ytRef} videoId={parsed.videoId} {...playerProps} />
          )}
          {parsed.platform === "soundcloud" && (
            <SoundCloudPlayer ref={scRef} trackUrl={parsed.videoId} {...playerProps} />
          )}

          {/* Loading indicator */}
          {!hasPlayed && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-lg pointer-events-none">
              <Loader2 size={36} className="animate-spin text-white/70" />
            </div>
          )}

          {/* Interaction overlay */}
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

      {/* "other" platform */}
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

      {/* Play button */}
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
