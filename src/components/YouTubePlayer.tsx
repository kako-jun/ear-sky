import { useEffect, useRef, useCallback, useState } from "react";
import { Play } from "lucide-react";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

const PRE_MARGIN = 5; // seconds before the misheard segment
const POST_MARGIN = 1; // seconds after the misheard segment

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
  const [error, setError] = useState(false);

  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const endSecRef = useRef(endSec);
  endSecRef.current = endSec;

  const playStart = Math.max(0, startSec - PRE_MARGIN);
  const playEnd = endSec + POST_MARGIN;

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!playerRef.current) return;
      const t = playerRef.current.getCurrentTime();
      onTimeUpdateRef.current?.(t);
      if (t >= endSecRef.current + POST_MARGIN) {
        playerRef.current.pauseVideo();
        if (timerRef.current) clearInterval(timerRef.current);
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
        videoId,
        playerVars: {
          start: Math.floor(playStart),
          end: Math.ceil(playEnd),
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e: YT.OnStateChangeEvent) => {
            onStateChangeRef.current?.(e.data);
            if (e.data === window.YT.PlayerState.PLAYING) {
              // Guard against YouTube's built-in replay starting from 0:00
              const cur = playerRef.current?.getCurrentTime() ?? 0;
              if (cur < playStart - 1) {
                playerRef.current?.seekTo(playStart, true);
              }
              startTimer();
            } else if (timerRef.current) {
              clearInterval(timerRef.current);
            }
          },
          onError: () => setError(true),
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
  }, [videoId, startSec, endSec, startTimer]);

  const handlePlay = useCallback(() => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(playStart, true);
    playerRef.current.playVideo();
  }, [playStart]);

  if (error) {
    return (
      <div className="aspect-video w-full rounded-lg bg-black/30 flex items-center justify-center text-white/40 text-sm">
        この動画は再生できません
      </div>
    );
  }

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
                     hover:brightness-110 active:scale-[0.98] transition-all
                     focus-visible:outline-2 focus-visible:outline-neon-blue"
        >
          <Play size={16} className="inline mr-1" />この部分を再生
        </button>
      )}
    </div>
  );
}
