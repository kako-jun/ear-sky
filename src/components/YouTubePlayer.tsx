import { useEffect, useRef, useCallback, useState } from "react";
import { Play } from "lucide-react";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface Props {
  videoId: string;
  startSec: number;
  endSec: number;
  onTimeUpdate?: (currentTime: number) => void;
  onStateChange?: (state: number) => void;
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

export default function YouTubePlayer({
  videoId,
  startSec,
  endSec,
  onTimeUpdate,
  onStateChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [ready, setReady] = useState(false);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!playerRef.current) return;
      const t = playerRef.current.getCurrentTime();
      onTimeUpdate?.(t);
      if (t >= endSec) {
        playerRef.current.pauseVideo();
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 100);
  }, [endSec, onTimeUpdate]);

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
        videoId,
        playerVars: {
          start: Math.floor(startSec),
          end: Math.ceil(endSec),
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e: YT.OnStateChangeEvent) => {
            onStateChange?.(e.data);
            if (e.data === window.YT.PlayerState.PLAYING) {
              startTimer();
            } else if (timerRef.current) {
              clearInterval(timerRef.current);
            }
          },
        },
      });
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          /* ignore */
        }
      }
    };
  }, [videoId, startSec, endSec, onStateChange, startTimer]);

  const handlePlay = useCallback(() => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(startSec, true);
    playerRef.current.playVideo();
  }, [startSec]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="aspect-video w-full rounded-lg overflow-hidden bg-black/50"
      />
      {ready && (
        <button
          onClick={handlePlay}
          className="mt-3 w-full py-2 rounded-lg bg-neon-pink text-white font-bold
                     hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Play size={16} className="inline mr-1" />この部分を再生
        </button>
      )}
    </div>
  );
}
