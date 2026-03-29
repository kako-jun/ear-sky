import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from "react";
import { useI18n } from "@/i18n";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

const PRE_MARGIN = 5;
const POST_MARGIN = 0.3;

export interface YouTubePlayerHandle {
  seekTo: (sec: number) => void;
  getDuration: () => number;
}

interface Props {
  videoId: string;
  startSec: number;
  endSec: number;
  onTimeUpdate?: (currentTime: number) => void;
  onPlaying?: () => void;
  onSegmentEnd?: () => void;
}

let apiLoaded = false;
let apiReady = false;
const readyCallbacks: (() => void)[] = [];

function loadYTApi() {
  if (apiLoaded) return;
  apiLoaded = true;
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady = () => {
    apiReady = true;
    readyCallbacks.forEach((cb) => cb());
    readyCallbacks.length = 0;
  };
}

function whenApiReady(cb: () => void) {
  if (apiReady) {
    cb();
  } else {
    readyCallbacks.push(cb);
    loadYTApi();
  }
}

const YouTubePlayer = forwardRef<YouTubePlayerHandle, Props>(function YouTubePlayer({
  videoId,
  startSec,
  endSec,
  onTimeUpdate,
  onPlaying,
  onSegmentEnd,
}, ref) {
  const t = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [error, setError] = useState(false);

  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onPlayingRef = useRef(onPlaying);
  onPlayingRef.current = onPlaying;
  const onSegmentEndRef = useRef(onSegmentEnd);
  onSegmentEndRef.current = onSegmentEnd;
  const endSecRef = useRef(endSec);
  endSecRef.current = endSec;

  useImperativeHandle(ref, () => ({
    seekTo: (sec: number) => {
      playerRef.current?.seekTo(sec, true);
    },
    getDuration: () => {
      return playerRef.current?.getDuration() || 0;
    },
  }));

  const playStart = Math.max(0, startSec - PRE_MARGIN);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!playerRef.current) return;
      const t = playerRef.current.getCurrentTime();
      onTimeUpdateRef.current?.(t);
      if (t >= endSecRef.current + POST_MARGIN) {
        playerRef.current.pauseVideo();
        if (timerRef.current) clearInterval(timerRef.current);
        onSegmentEndRef.current?.();
      }
    }, 100);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    whenApiReady(() => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      const div = document.createElement("div");
      div.id = "yt-player-" + videoId;
      el.innerHTML = "";
      el.appendChild(div);

      playerRef.current = new window.YT.Player(div.id, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          start: Math.floor(playStart),
          autoplay: 1,
          controls: 1,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: () => {},
          onStateChange: (e: YT.OnStateChangeEvent) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              onPlayingRef.current?.();
              startTimer();
            } else {
              if (timerRef.current) clearInterval(timerRef.current);
            }
          },
          onError: () => setError(true),
        },
      });
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
      }
    };
  }, [videoId, startTimer]);

  if (error) {
    return (
      <div className="aspect-video w-full rounded-lg bg-black/30 flex items-center justify-center text-white/40 text-sm">
        {t.youtube.cannotPlay}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="aspect-video w-full rounded-lg overflow-hidden bg-black/50"
    />
  );
});

export default YouTubePlayer;
