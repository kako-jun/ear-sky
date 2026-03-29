import { useRef, useEffect, useState, useCallback } from "react";
import { useI18n } from "@/i18n";
import { RotateCcw } from "lucide-react";

const PRE_MARGIN = 5;
const POST_MARGIN = 0.3;

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

  const handlePlayRef = useRef<() => void>(() => {});

  const handleIframeLoad = useCallback(() => {
    // Auto-play once iframe is ready
    setTimeout(() => handlePlayRef.current(), 300);
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
  handlePlayRef.current = handlePlay;

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
        {/* Overlay: always blocks iframe interaction; shows replay icon after segment ends */}
        <div
          onClick={segmentEnded ? handlePlay : undefined}
          className={`absolute inset-0 z-10 rounded-lg flex items-center justify-center
            ${segmentEnded ? "bg-black/30 cursor-pointer hover:bg-black/20 transition-colors" : ""}`}
          role={segmentEnded ? "button" : undefined}
          aria-label={segmentEnded ? t.niconico.playSegment : undefined}
        >
          {segmentEnded && <RotateCcw size={40} className="text-white/70" />}
        </div>
      </div>
    </div>
  );
}
