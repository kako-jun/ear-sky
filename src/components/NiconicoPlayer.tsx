import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useI18n } from "@/i18n";

const PRE_MARGIN = 5;
const POST_MARGIN = 0.3;
const NICO_ORIGIN = "https://embed.nicovideo.jp";
const AUTOPLAY_FALLBACK_MS = 3000;
const HINT_AUTO_HIDE_MS = 6000;

export interface NiconicoPlayerHandle {
  /** Send seek + play to the embed (must be called inside a user-activation handler). */
  play: () => void;
}

interface Props {
  videoId: string;
  startSec: number;
  endSec: number;
  onTimeUpdate?: (currentTime: number) => void;
  onPlaying?: () => void;
  onSegmentEnd?: () => void;
  /** Fired once with the video thumbnail URL from loadComplete. */
  onThumbnail?: (url: string) => void;
  onReady?: () => void;
}

/**
 * Niconico embed player (jsapi handshake).
 *
 * The embed URL carries `jsapi=1&playerId=<id>`, and every message we post
 * includes `sourceConnectorType: 1` + the same `playerId`. Without this
 * handshake the embed silently ignores postMessage. With it, play / pause /
 * seek and event reception (loadComplete / playerStatusChange /
 * playerMetadataChange / error) all work (verified 2026-07 in a real browser).
 *
 * Units: URL `from` is seconds (floor). `seek` data.time is milliseconds.
 * `playerMetadataChange.currentTime` is milliseconds. The app works in seconds
 * and converts at the boundary.
 */

// Received messages arrive with sourceConnectorType: 0.
interface NicoMessage {
  sourceConnectorType: number;
  playerId: string;
  eventName: string;
  data?: unknown;
}
interface LoadCompleteData {
  videoInfo?: { thumbnailUrl?: string };
}
interface PlayerStatusChangeData {
  playerStatus: number;
}
interface PlayerMetadataChangeData {
  currentTime: number;
}

const NiconicoPlayer = forwardRef<NiconicoPlayerHandle, Props>(function NiconicoPlayer({
  videoId,
  startSec,
  endSec,
  onTimeUpdate,
  onPlaying,
  onSegmentEnd,
  onThumbnail,
  onReady,
}, ref) {
  const t = useI18n();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const thumbSentRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPlayingRef = useRef(onPlaying);
  onPlayingRef.current = onPlaying;
  const onSegmentEndRef = useRef(onSegmentEnd);
  onSegmentEndRef.current = onSegmentEnd;
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onThumbnailRef = useRef(onThumbnail);
  onThumbnailRef.current = onThumbnail;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const [error, setError] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const playStart = Math.max(0, startSec - PRE_MARGIN);
  const playEnd = endSec + POST_MARGIN;

  // Component-unique player id (stable for the lifetime of this component).
  const playerId = useRef(`nico-${Math.random().toString(36).slice(2)}`).current;
  const embedUrl =
    `${NICO_ORIGIN}/watch/${videoId}?jsapi=1&playerId=${playerId}&from=${Math.floor(playStart)}`;

  // --- send ---
  const sendToNico = (eventName: string, data?: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(
      { sourceConnectorType: 1, playerId, eventName, ...(data ? { data } : {}) },
      NICO_ORIGIN,
    );
  };

  useImperativeHandle(ref, () => ({
    play: () => {
      endedRef.current = false;
      startedRef.current = false;
      setShowHint(false);
      // seek is milliseconds; from= already head-starts the first play but a
      // redundant seek is harmless and is required for replay.
      sendToNico("seek", { time: Math.floor(playStart * 1000) });
      sendToNico("play");
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      if (hintHideTimerRef.current) clearTimeout(hintHideTimerRef.current);
      fallbackTimerRef.current = setTimeout(() => {
        setShowHint(true);
        // Auto-fade the hint so it doesn't linger indefinitely.
        hintHideTimerRef.current = setTimeout(() => setShowHint(false), HINT_AUTO_HIDE_MS);
      }, AUTOPLAY_FALLBACK_MS);
    },
  }), [playStart]);

  // --- receive ---
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== NICO_ORIGIN) return;
      const d = e.data as NicoMessage;
      if (!d || d.playerId !== playerId) return;
      switch (d.eventName) {
        case "loadComplete": {
          const url = (d.data as LoadCompleteData)?.videoInfo?.thumbnailUrl;
          if (url && !thumbSentRef.current) {
            thumbSentRef.current = true;
            onThumbnailRef.current?.(url);
          }
          break;
        }
        case "playerStatusChange": {
          const s = (d.data as PlayerStatusChangeData)?.playerStatus;
          if (s === 2) {
            if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
            if (hintHideTimerRef.current) clearTimeout(hintHideTimerRef.current);
            setShowHint(false);
            if (!startedRef.current) {
              startedRef.current = true;
              onPlayingRef.current?.();
            }
          }
          break;
        }
        case "playerMetadataChange": {
          const ct = (d.data as PlayerMetadataChangeData)?.currentTime;
          if (typeof ct !== "number") break;
          // Ignore metadata that arrives after the segment already ended (a
          // pause was sent but a late playerMetadataChange can still land).
          if (endedRef.current) break;
          const sec = ct / 1000;
          onTimeUpdateRef.current?.(sec);
          if (sec >= playEnd) {
            endedRef.current = true;
            sendToNico("pause");
            onSegmentEndRef.current?.();
          }
          break;
        }
        case "error":
          setError(true);
          break;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, playEnd]);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      if (hintHideTimerRef.current) clearTimeout(hintHideTimerRef.current);
    };
  }, []);

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
        ref={iframeRef}
        src={embedUrl}
        className="w-full h-full"
        allow="autoplay; fullscreen"
        title={`${videoId} — Niconico`}
        onLoad={() => onReadyRef.current?.()}
      />
      {showHint && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 px-3 py-2 rounded-lg
                        bg-bar-counter/95 backdrop-blur-md border border-neon-blue/50
                        text-xs text-white shadow-lg pointer-events-none whitespace-nowrap">
          {t.niconico.autoplayHint}
        </div>
      )}
    </div>
  );
});

export default NiconicoPlayer;
