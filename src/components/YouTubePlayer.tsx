import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from "react";
import { useI18n } from "@/i18n";
import { RotateCcw } from "lucide-react";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

const PRE_MARGIN = 5; // seconds before the misheard segment
const POST_MARGIN = 1; // seconds after the misheard segment

export interface YouTubePlayerHandle {
  seekTo: (sec: number) => void;
  getDuration: () => number;
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

const YouTubePlayer = forwardRef<YouTubePlayerHandle, Props>(function YouTubePlayer({
  videoId,
  startSec,
  endSec,
  onTimeUpdate,
  onStateChange,
}, ref) {
  const t = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [segmentEnded, setSegmentEnded] = useState(false);
  const [error, setError] = useState(false);

  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
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
  const playEnd = endSec + POST_MARGIN;

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!playerRef.current) return;
      const t = playerRef.current.getCurrentTime();
      onTimeUpdateRef.current?.(t);
      if (t >= endSecRef.current + POST_MARGIN) {
        playerRef.current.pauseVideo();
        setSegmentEnded(true);
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
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          start: Math.floor(playStart),
          end: Math.ceil(playEnd),
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
            onStateChangeRef.current?.(e.data);
            if (e.data === window.YT.PlayerState.PLAYING) {
              setPlaying(true);
              setSegmentEnded(false);
              startTimer();
            } else {
              setPlaying(false);
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
        try {
          playerRef.current.destroy();
        } catch {
          /* ignore */
        }
      }
    };
  }, [videoId, startTimer]); // Only recreate on videoId change; startSec/endSec use seekTo via ref

  const handlePlay = useCallback(() => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(playStart, true);
    playerRef.current.playVideo();
  }, [playStart]);

  if (error) {
    return (
      <div className="aspect-video w-full rounded-lg bg-black/30 flex items-center justify-center text-white/40 text-sm">
        {t.youtube.cannotPlay}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative">
        <div
          ref={containerRef}
          className="aspect-video w-full rounded-lg overflow-hidden bg-black/50"
        />
        {/* After segment ends: overlay blocks iframe and shows replay button */}
        {segmentEnded && !playing && (
          <button
            onClick={handlePlay}
            className="absolute inset-0 z-10 rounded-lg bg-black/60 flex items-center justify-center cursor-pointer
                       hover:bg-black/50 transition-colors"
            aria-label={t.youtube.replay}
          >
            <RotateCcw size={40} className="text-white/70" />
          </button>
        )}
      </div>
    </div>
  );
});

export default YouTubePlayer;
