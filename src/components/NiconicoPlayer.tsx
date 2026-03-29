import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useI18n } from "@/i18n";

const PRE_MARGIN = 5;
const POST_MARGIN = 0.3;

export interface NiconicoPlayerHandle {
  play: () => void;
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

const NiconicoPlayer = forwardRef<NiconicoPlayerHandle, Props>(function NiconicoPlayer({
  videoId,
  startSec,
  endSec,
  onTimeUpdate,
  onPlaying,
  onSegmentEnd,
  onReady,
}, ref) {
  const t = useI18n();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const onPlayingRef = useRef(onPlaying);
  onPlayingRef.current = onPlaying;
  const onSegmentEndRef = useRef(onSegmentEnd);
  onSegmentEndRef.current = onSegmentEnd;
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [error, setError] = useState(false);

  const playStart = Math.max(0, startSec - PRE_MARGIN);
  const playEnd = endSec + POST_MARGIN;

  const doPlay = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ eventName: "seek", data: { time: playStart } }),
        "https://embed.nicovideo.jp"
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ eventName: "play" }),
        "https://embed.nicovideo.jp"
      );
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
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ eventName: "pause" }),
            "https://embed.nicovideo.jp"
          );
        }
        if (intervalRef.current) clearInterval(intervalRef.current);
        onSegmentEndRef.current?.();
      }, duration);
    }
  }, [playStart, playEnd]);

  useImperativeHandle(ref, () => ({
    play: doPlay,
  }), [doPlay]);

  const handleIframeLoad = useCallback(() => {
    onReadyRef.current?.();
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const embedUrl = `https://embed.nicovideo.jp/watch/${videoId}?from=${Math.floor(playStart)}&autoplay=0&mute=0&commentLayerMode=0`;

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
    <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/50">
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="w-full h-full"
        allow="autoplay; fullscreen"
        allowFullScreen
        title={`${videoId} — Niconico`}
        onLoad={handleIframeLoad}
        onError={() => setError(true)}
      />
    </div>
  );
});

export default NiconicoPlayer;
