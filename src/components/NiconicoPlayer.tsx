import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useI18n } from "@/i18n";

const PRE_MARGIN = 5;
const POST_MARGIN = 0.3;

export interface NiconicoPlayerHandle {
  play: () => void;
  hideOverlay: () => void;
}

interface Props {
  videoId: string;
  startSec: number;
  endSec: number;
  onTimeUpdate?: (currentTime: number) => void;
  onPlaying?: () => void;
  onSegmentEnd?: () => void;
  onReady?: () => void;
}

/**
 * Niconico embed player.
 *
 * postMessage control and autoplay=1 do not work with the current Niconico
 * embed player. The user must click Niconico's native play button.
 *
 * Detection: when the user clicks inside the cross-origin iframe, the parent
 * window loses focus (blur event). VideoSegment detects this and starts the
 * subtitle timer. A "hole overlay" blocks clicks everywhere except the center
 * play button area, preventing unwanted interactions.
 */
const NiconicoPlayer = forwardRef<NiconicoPlayerHandle, Props>(function NiconicoPlayer({
  videoId,
  startSec,
  endSec,
  onTimeUpdate,
  onPlaying,
  onSegmentEnd,
}, ref) {
  const t = useI18n();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const startedRef = useRef(false);
  const onPlayingRef = useRef(onPlaying);
  onPlayingRef.current = onPlaying;
  const onSegmentEndRef = useRef(onSegmentEnd);
  onSegmentEndRef.current = onSegmentEnd;
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const [error, setError] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  const playStart = Math.max(0, startSec - PRE_MARGIN);
  const playEnd = endSec + POST_MARGIN;

  const startTimer = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    onPlayingRef.current?.();

    playStartTimeRef.current = Date.now();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - playStartTimeRef.current) / 1000;
      const currentTime = playStart + elapsed;
      onTimeUpdateRef.current?.(currentTime);
    }, 100);

    if (timerRef.current) clearTimeout(timerRef.current);
    const duration = (playEnd - playStart) * 1000;
    timerRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      onSegmentEndRef.current?.();
    }, duration);
  }, [playStart, playEnd]);

  useImperativeHandle(ref, () => ({
    play: startTimer,
    hideOverlay: () => setShowOverlay(false),
  }), [startTimer]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const embedUrl = `https://embed.nicovideo.jp/watch/${videoId}?from=${Math.floor(playStart)}`;

  if (error) {
    return (
      <div className="aspect-video w-full rounded-lg bg-black/30 flex items-center justify-center text-white/50 text-sm">
        <a
          href={`https://www.nicovideo.jp/watch/${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white/60"
        >
          {t.niconico.fallbackLink}
        </a>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/50 relative">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="fullscreen"
        title={`${videoId} — Niconico`}
        onError={() => setError(true)}
      />

      {/* Hole overlay: 4 blocks leave a rectangular gap in the center.
         Only real DOM absence lets clicks pass through to the iframe. */}
      {showOverlay && (
        <>
          <div className="absolute top-0 left-0 right-0 h-[35%] bg-black/50 z-10" />
          <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-black/50 z-10" />
          <div className="absolute top-[35%] left-0 w-[40%] h-[30%] bg-black/50 z-10" />
          <div className="absolute top-[35%] right-0 w-[40%] h-[30%] bg-black/50 z-10" />
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none text-white/80">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
});

export default NiconicoPlayer;
