import { useState, useCallback, useRef } from "react";
import { SubtitleCue } from "@/types";
import { formatTime, parseVideoUrl } from "@/lib/video";
import { useI18n } from "@/i18n";
import YouTubePlayer from "./YouTubePlayer";
import NiconicoPlayer from "./NiconicoPlayer";
import SoundCloudPlayer from "./SoundCloudPlayer";
import Subtitle from "./Subtitle";
import { Play } from "lucide-react";

interface Props {
  videoUrl: string;
  startSec: number;
  endSec: number;
  cues: SubtitleCue[];
  /** Start with player expanded */
  autoExpand?: boolean;
  /** Allow tap-to-stop during playback (editor preview only) */
  stoppable?: boolean;
  /** Called when playback enters a cue region */
  onCueReached?: () => void;
  /** Called every time playback starts */
  onPlay?: () => void;
}

/**
 * Shared video player + karaoke subtitle component.
 *
 * When stoppable=true (editor preview): tap during playback collapses back to
 * Play overlay. Next play always uses the latest props (slider/subtitle edits).
 *
 * When stoppable=false (default, posted cards): playback runs to segment end,
 * then auto-collapses. No interruption.
 */
export default function VideoSegment({
  videoUrl,
  startSec,
  endSec,
  cues,
  autoExpand = false,
  stoppable = false,
  onCueReached,
  onPlay,
}: Props) {
  const t = useI18n();
  const [currentTime, setCurrentTime] = useState(0);
  const [expanded, setExpanded] = useState(autoExpand);
  const [hasPlayed, setHasPlayed] = useState(false);
  const cueReachedRef = useRef(false);

  const parsed = parseVideoUrl(videoUrl);

  const handleTimeUpdate = useCallback((t: number) => {
    setCurrentTime(t);
    if (onCueReached && !cueReachedRef.current && cues.length > 0) {
      const lastCue = cues[cues.length - 1];
      const lastCueEnd = lastCue.showAt + lastCue.duration;
      if (t >= lastCueEnd) {
        cueReachedRef.current = true;
        onCueReached();
      }
    }
  }, [cues, onCueReached]);

  const handlePlaying = useCallback(() => {
    setHasPlayed(true);
    onPlay?.();
  }, [onPlay]);

  const handleSegmentEnd = useCallback(() => {
    setExpanded(false);
  }, []);

  // Keep subtitles visible after segment ends (last cue stays on screen)
  const activeCues = hasPlayed ? cues : [];

  if (!parsed) return null;

  return (
    <div>
      {expanded ? (
        <div className="relative">
          {parsed.platform === "youtube" && (
            <YouTubePlayer
              videoId={parsed.videoId}
              startSec={startSec}
              endSec={endSec}
              onTimeUpdate={handleTimeUpdate}
              onPlaying={handlePlaying}
              onSegmentEnd={handleSegmentEnd}
            />
          )}
          {parsed.platform === "niconico" && (
            <NiconicoPlayer
              videoId={parsed.videoId}
              startSec={startSec}
              endSec={endSec}
              onTimeUpdate={handleTimeUpdate}
              onPlaying={handlePlaying}
              onSegmentEnd={handleSegmentEnd}
            />
          )}
          {parsed.platform === "soundcloud" && (
            <SoundCloudPlayer
              trackUrl={parsed.videoId}
              startSec={startSec}
              endSec={endSec}
              onTimeUpdate={handleTimeUpdate}
              onPlaying={handlePlaying}
              onSegmentEnd={handleSegmentEnd}
            />
          )}
          {parsed.platform === "other" && (() => {
            let safeHref: string | null = null;
            try {
              const u = new URL(parsed.videoId);
              if (u.protocol === "https:" || u.protocol === "http:") safeHref = u.href;
            } catch { /* invalid */ }
            return (
              <div className="py-6 bg-black/30 flex items-center justify-center text-white/40 text-sm">
                {safeHref ? (
                  <a href={safeHref} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60">
                    {formatTime(startSec)}〜{formatTime(endSec)} →
                  </a>
                ) : (
                  <span>{formatTime(startSec)}〜{formatTime(endSec)}</span>
                )}
              </div>
            );
          })()}

          {/* Overlay: blocks iframe interaction */}
          {parsed.platform !== "other" && (
            <div
              onClick={stoppable ? () => setExpanded(false) : undefined}
              className={`absolute inset-0 z-10 rounded-lg ${stoppable ? "cursor-pointer" : ""}`}
              role={stoppable ? "button" : undefined}
              aria-label={stoppable ? "Stop" : undefined}
            />
          )}

          <Subtitle cues={activeCues} currentTime={currentTime} />
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          aria-label={t.postCard.play}
          className="relative w-full hover:opacity-90 transition-opacity
                     focus-visible:outline-2 focus-visible:outline-neon-blue"
        >
          {parsed.platform === "youtube" ? (
            <img
              src={`https://img.youtube.com/vi/${parsed.videoId}/mqdefault.jpg`}
              alt=""
              className="w-full aspect-video object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-video bg-black/30" />
          )}
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 text-white/80">
            <Play size={36} />
            <span className="text-xs text-white/60">
              {formatTime(startSec)} 〜 {formatTime(endSec)}
            </span>
          </div>
        </button>
      )}

    </div>
  );
}
