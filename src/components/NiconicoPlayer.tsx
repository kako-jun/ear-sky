import { useRef, useEffect, useState, useCallback } from "react";
import { useI18n } from "@/i18n";
import { Play, RotateCcw } from "lucide-react";

const PRE_MARGIN = 5;
const POST_MARGIN = 1;

interface Props {
  videoId: string;
  startSec: number;
  endSec: number;
  onTimeUpdate?: (currentTime: number) => void;
  onStateChange?: (state: "playing" | "paused" | "ended") => void;
}

export default function NiconicoPlayer({
  videoId,
  startSec,
  endSec,
  onTimeUpdate,
  onStateChange,
}: Props) {
  const t = useI18n();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const [ready, setReady] = useState(false);
  const [segmentEnded, setSegmentEnded] = useState(false);
  const [error, setError] = useState(false);

  const playStart = Math.max(0, startSec - PRE_MARGIN);
  const playEnd = endSec + POST_MARGIN;

  const embedUrl = `https://embed.nicovideo.jp/watch/${videoId}?from=${Math.floor(playStart)}&autoplay=0&mute=0&commentLayerMode=0`;

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== "https://embed.nicovideo.jp") return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data.eventName === "playerStatusChange") {
          if (data.data?.playerStatus === 2) {
            onStateChangeRef.current?.("playing");
          } else if (data.data?.playerStatus === 3) {
            onStateChangeRef.current?.("paused");
          } else if (data.data?.playerStatus === 4) {
            onStateChangeRef.current?.("ended");
          }
        }
      } catch {
        // not our message
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handlePlay = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ eventName: "seek", data: { time: playStart } }),
        "https://embed.nicovideo.jp"
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ eventName: "play" }),
        "https://embed.nicovideo.jp"
      );
      onStateChangeRef.current?.("playing");
      setSegmentEnded(false);

      // Simulated time updates (niconico embed doesn't expose currentTime)
      playStartTimeRef.current = Date.now();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - playStartTimeRef.current) / 1000;
        const currentTime = playStart + elapsed;
        onTimeUpdateRef.current?.(currentTime);
      }, 100);

      // Timer-based end detection
      if (timerRef.current) clearTimeout(timerRef.current);
      const duration = (playEnd - playStart) * 1000;
      timerRef.current = setTimeout(() => {
        // Send pause to the iframe to stop playback
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ eventName: "pause" }),
            "https://embed.nicovideo.jp"
          );
        }
        setSegmentEnded(true);
        onStateChangeRef.current?.("ended");
        if (intervalRef.current) clearInterval(intervalRef.current);
      }, duration);
    }
  }, [playStart, playEnd]);

  if (error) {
    return (
      <div className="aspect-video w-full rounded-lg bg-black/30 flex items-center justify-center text-white/40 text-sm">
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
    <div className="w-full">
      <div className="relative">
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
        {segmentEnded && (
          <button
            onClick={handlePlay}
            className="absolute inset-0 z-10 rounded-lg bg-black/60 flex items-center justify-center cursor-pointer
                       hover:bg-black/50 transition-colors"
            aria-label={t.niconico.playSegment}
          >
            <RotateCcw size={40} className="text-white/70" />
          </button>
        )}
      </div>
      {ready && !segmentEnded && (
        <button
          onClick={handlePlay}
          className="mt-3 w-full py-2 rounded-lg bg-neon-pink text-white font-bold
                     hover:brightness-110 active:scale-[0.98] transition-all
                     focus-visible:outline-2 focus-visible:outline-neon-blue"
        >
          <Play size={16} className="inline mr-1" />{t.niconico.playSegment}
        </button>
      )}
    </div>
  );
}
