import { useState, useCallback, useRef, useEffect } from "react";
import { SubtitleCue } from "@/types";
import { formatTime, parseVideoUrl } from "@/lib/video";
import { useI18n } from "@/i18n";
import YouTubePlayer, { YouTubePlayerHandle } from "./YouTubePlayer";
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
 * Platform iframes are pre-mounted (hidden) once the card enters the viewport
 * (IntersectionObserver). On user tap, play() is called synchronously inside
 * the click handler so the user gesture propagates to cross-origin iframes.
 * This avoids autoplay being blocked by in-app browsers (e.g. LINE).
 *
 * When stoppable=true (editor preview): tap during playback collapses back to
 * Play overlay. Next play always uses the latest props (slider/subtitle edits).
 *
 * When stoppable=false (default, posted cards): playback runs to segment end,
 * then auto-collapses. No interruption.
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
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(autoExpand);
  const [pending, setPending] = useState(false);
  const cueReachedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const ytRef = useRef<YouTubePlayerHandle>(null);
  const nicoRef = useRef<NiconicoPlayerHandle>(null);
  const scRef = useRef<SoundCloudPlayerHandle>(null);

  const parsed = parseVideoUrl(videoUrl);

  // Pre-mount iframe only when the card scrolls into the viewport
  useEffect(() => {
    const el = rootRef.current;
    if (!el || parsed?.platform === "other") return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { rootMargin: "200px" },
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
    setPending(false);
    onPlay?.();
  }, [onPlay]);

  const handleSegmentEnd = useCallback(() => {
    setExpanded(false);
  }, []);

  const handleReady = useCallback(() => {
    setReady(true);
  }, []);

  // When pending and ready arrives, fire play
  const pendingRef = useRef(false);
  pendingRef.current = pending;
  const readyFiredPlay = useRef(false);
  useEffect(() => {
    if (ready && pendingRef.current && !readyFiredPlay.current) {
      readyFiredPlay.current = true;
      if (parsed?.platform === "youtube") ytRef.current?.play();
      else if (parsed?.platform === "niconico") nicoRef.current?.play();
      else if (parsed?.platform === "soundcloud") scRef.current?.play();
    }
  }, [ready, pending, parsed?.platform]);

  const handlePlayClick = useCallback(() => {
    if (ready) {
      // Synchronous play() inside click handler — gesture propagates
      if (parsed?.platform === "youtube") ytRef.current?.play();
      else if (parsed?.platform === "niconico") nicoRef.current?.play();
      else if (parsed?.platform === "soundcloud") scRef.current?.play();
      setExpanded(true);
    } else {
      // iframe not ready yet — show loading, play when ready arrives
      setVisible(true);
      setPending(true);
      setExpanded(true);
    }
  }, [parsed?.platform, ready]);

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
    onReady: handleReady,
  };

  return (
    <div ref={rootRef}>
      {/* Player: mounted when visible (IntersectionObserver), hidden when collapsed */}
      {hasPlayer && visible && (
        <div className={`relative ${expanded ? "" : "hidden"}`}>
          {parsed.platform === "youtube" && (
            <YouTubePlayer ref={ytRef} videoId={parsed.videoId} {...playerProps} />
          )}
          {parsed.platform === "niconico" && (
            <NiconicoPlayer ref={nicoRef} videoId={parsed.videoId} {...playerProps} />
          )}
          {parsed.platform === "soundcloud" && (
            <SoundCloudPlayer ref={scRef} trackUrl={parsed.videoId} {...playerProps} />
          )}

          {/* Loading spinner while waiting for iframe ready */}
          {pending && !hasPlayed && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 rounded-lg">
              <Loader2 size={36} className="animate-spin text-white/70" />
            </div>
          )}

          {/* Overlay: blocks iframe interaction */}
          <div
            onClick={stoppable ? () => setExpanded(false) : undefined}
            className={`absolute inset-0 z-10 rounded-lg ${stoppable ? "cursor-pointer" : ""}`}
            role={stoppable ? "button" : undefined}
            aria-label={stoppable ? "Stop" : undefined}
          />
          <Subtitle cues={activeCues} currentTime={currentTime} />
        </div>
      )}

      {/* "other" platform: mount/unmount (no iframe to pre-mount) */}
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

      {/* Play button overlay — shown when collapsed */}
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
