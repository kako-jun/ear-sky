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
 * Platform-specific strategies:
 *
 * - YouTube: mount-on-click + autoplay:1. API script pre-loaded.
 * - SoundCloud: mount-on-click + auto_play=true.
 * - Niconico: pre-mount (IntersectionObserver) + hole overlay.
 *   postMessage/autoplay don't work. User clicks Niconico's native play
 *   button through a transparent hole in the overlay. window.blur detects
 *   the click and starts the subtitle timer. One click to play.
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
  const [nicoKey, setNicoKey] = useState(0);
  const cueReachedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const ytRef = useRef<YouTubePlayerHandle>(null);
  const nicoRef = useRef<NiconicoPlayerHandle>(null);
  const scRef = useRef<SoundCloudPlayerHandle>(null);

  const parsed = parseVideoUrl(videoUrl);
  const isNiconico = parsed?.platform === "niconico";

  // YouTube: pre-load API script. Niconico: pre-mount iframe.
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
    setCurrentTime(0);
    setHasPlayed(false);
    cueReachedRef.current = false;
    // Niconico: remount iframe (new key) to stop playback. Hole overlay resets.
    if (isNiconico) {
      setNicoKey(k => k + 1);
    }
  }, [isNiconico]);

  const handlePlayClick = useCallback(() => {
    setExpanded(true);
  }, []);

  // Niconico: detect iframe click via window.blur + activeElement check.
  // After blur, verify that our Niconico iframe actually received focus.
  useEffect(() => {
    if (!isNiconico || !nicoVisible || hasPlayed) return;
    const container = rootRef.current;
    if (!container) return;
    let timerId: ReturnType<typeof setTimeout>;
    let checkId: ReturnType<typeof setTimeout>;
    const onBlur = () => {
      // After blur, check if an iframe inside our container got focus
      checkId = setTimeout(() => {
        const active = document.activeElement;
        if (active?.tagName === "IFRAME" && container.contains(active)) {
          setExpanded(true);
          nicoRef.current?.hideOverlay();
          timerId = setTimeout(() => nicoRef.current?.play(), 1200);
        }
      }, 0);
    };
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("blur", onBlur);
      clearTimeout(timerId);
      clearTimeout(checkId);
    };
  }, [isNiconico, nicoVisible, hasPlayed]);

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
      {/* Niconico: pre-mounted, always in DOM when visible. Hole overlay on top. */}
      {isNiconico && nicoVisible && (
        <div className="relative">
          <NiconicoPlayer key={nicoKey} ref={nicoRef} videoId={parsed.videoId} {...playerProps} />
          {expanded && <Subtitle cues={activeCues} currentTime={currentTime} />}
        </div>
      )}

      {/* YouTube / SoundCloud: mount on click */}
      {!isNiconico && hasPlayer && expanded && (
        <div className="relative">
          {parsed.platform === "youtube" && (
            <YouTubePlayer ref={ytRef} videoId={parsed.videoId} {...playerProps} />
          )}
          {parsed.platform === "soundcloud" && (
            <SoundCloudPlayer ref={scRef} trackUrl={parsed.videoId} {...playerProps} />
          )}

          {!hasPlayed && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-lg pointer-events-none">
              <Loader2 size={36} className="animate-spin text-white/70" />
            </div>
          )}

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

      {/* Play button: YouTube/SoundCloud only (Niconico uses hole overlay) */}
      {!isNiconico && !expanded && (
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
