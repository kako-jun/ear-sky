import { useRef, useEffect, useState, useCallback } from "react";
import { Play } from "lucide-react";

interface Props {
  videoId: string;
  startSec: number;
  endSec: number;
  onStateChange?: (state: "playing" | "paused" | "ended") => void;
}

export default function NiconicoPlayer({
  videoId,
  startSec,
  endSec,
  onStateChange,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  const embedUrl = `https://embed.nicovideo.jp/watch/${videoId}?from=${Math.floor(startSec)}&autoplay=0&mute=0&commentLayerMode=0`;

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== "https://embed.nicovideo.jp") return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data.eventName === "playerStatusChange") {
          if (data.data?.playerStatus === 2) {
            onStateChange?.("playing");
          } else if (data.data?.playerStatus === 3) {
            onStateChange?.("paused");
          } else if (data.data?.playerStatus === 4) {
            onStateChange?.("ended");
          }
        }
      } catch {
        // not our message
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onStateChange]);

  const handleIframeLoad = useCallback(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handlePlay = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ eventName: "seek", data: { time: startSec } }),
        "https://embed.nicovideo.jp"
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ eventName: "play" }),
        "https://embed.nicovideo.jp"
      );
      onStateChange?.("playing");

      // Timer-based end detection
      if (timerRef.current) clearTimeout(timerRef.current);
      const duration = (endSec - startSec) * 1000;
      timerRef.current = setTimeout(() => {
        onStateChange?.("ended");
      }, duration);
    }
  }, [startSec, endSec, onStateChange]);

  if (error) {
    return (
      <div className="aspect-video w-full rounded-lg bg-black/30 flex items-center justify-center text-white/40 text-sm">
        <a
          href={`https://www.nicovideo.jp/watch/${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white/60"
        >
          ニコニコ動画で再生
        </a>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/50">
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full"
          allow="autoplay; fullscreen"
          allowFullScreen
          title={`${videoId} — ニコニコ動画`}
          onLoad={handleIframeLoad}
          onError={() => setError(true)}
        />
      </div>
      {ready && (
        <button
          onClick={handlePlay}
          className="mt-3 w-full py-2 rounded-lg bg-neon-pink text-white font-bold
                     hover:brightness-110 active:scale-[0.98] transition-all
                     focus-visible:outline-2 focus-visible:outline-neon-blue"
        >
          <Play size={16} className="inline mr-1" />この部分を再生
        </button>
      )}
    </div>
  );
}
