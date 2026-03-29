import { useRef, useEffect, useState } from "react";
import { useI18n } from "@/i18n";

const PRE_MARGIN = 5;
const POST_MARGIN = 0.3;

interface Props {
  trackUrl: string;
  startSec: number;
  endSec: number;
  onTimeUpdate?: (currentTime: number) => void;
  onPlaying?: () => void;
  onSegmentEnd?: () => void;
}

declare global {
  interface Window {
    SC: {
      Widget: {
        (el: HTMLIFrameElement): SCWidget;
        Events: {
          READY: string;
          PLAY: string;
          PAUSE: string;
          FINISH: string;
          PLAY_PROGRESS: string;
          ERROR: string;
        };
      };
    };
  }
}

interface SCWidget {
  bind(event: string, cb: (data?: SCProgressData) => void): void;
  unbind(event: string): void;
  play(): void;
  pause(): void;
  seekTo(ms: number): void;
  getPosition(cb: (ms: number) => void): void;
  getDuration(cb: (ms: number) => void): void;
}

interface SCProgressData {
  currentPosition: number;
  relativePosition: number;
}

let apiPromise: Promise<void> | null = null;

function loadSCApi(): Promise<void> {
  if (window.SC) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = "https://w.soundcloud.com/player/api.js";
    tag.onload = () => resolve();
    tag.onerror = () => {
      apiPromise = null;
      reject(new Error("Failed to load SoundCloud API"));
    };
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export default function SoundCloudPlayer({
  trackUrl,
  startSec,
  endSec,
  onTimeUpdate,
  onPlaying,
  onSegmentEnd,
}: Props) {
  const t = useI18n();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<SCWidget | null>(null);
  const [error, setError] = useState(false);

  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onPlayingRef = useRef(onPlaying);
  onPlayingRef.current = onPlaying;
  const onSegmentEndRef = useRef(onSegmentEnd);
  onSegmentEndRef.current = onSegmentEnd;
  const endSecRef = useRef(endSec);
  endSecRef.current = endSec;
  const segmentEndedRef = useRef(false);

  const playStart = Math.max(0, startSec - PRE_MARGIN);

  const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}&auto_play=true&color=%23ff4d8d&show_artwork=true&show_user=false&show_playcount=false&buying=false&sharing=false&download=false`;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    loadSCApi().then(() => {
      const widget = window.SC.Widget(iframe);
      widgetRef.current = widget;

      widget.bind(window.SC.Widget.Events.READY, () => {
        widget.seekTo(playStart * 1000);
        widget.play();
      });

      widget.bind(window.SC.Widget.Events.PLAY, () => {
        onPlayingRef.current?.();
      });

      widget.bind(window.SC.Widget.Events.PLAY_PROGRESS, (data) => {
        if (!data) return;
        const currentSec = data.currentPosition / 1000;
        onTimeUpdateRef.current?.(currentSec);
        if (currentSec >= endSecRef.current + POST_MARGIN && !segmentEndedRef.current) {
          segmentEndedRef.current = true;
          widget.pause();
          onSegmentEndRef.current?.();
        }
      });

      widget.bind(window.SC.Widget.Events.ERROR, () => {
        setError(true);
      });
    });

    return () => {
      widgetRef.current = null;
    };
  }, [trackUrl, playStart]);

  if (error) {
    return (
      <div className="w-full h-[166px] rounded-lg bg-black/30 flex items-center justify-center text-white/40 text-sm">
        {t.soundcloud.cannotPlay}
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden bg-black/50">
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="w-full h-[166px]"
        allow="autoplay"
        title="SoundCloud"
      />
    </div>
  );
}
