import { useRef, useCallback, useEffect, useState } from "react";
import { formatTime } from "@/lib/video";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  min: number;
  max: number;
  startVal: number;
  endVal: number;
  onStartChange: (v: number) => void;
  onEndChange: (v: number) => void;
  /** Called while a thumb is being dragged — use for video seek */
  onSeek?: (sec: number) => void;
}

/**
 * Dual-thumb range slider with:
 * - Two draggable thumbs
 * - Highlighted region between thumbs (neon-blue)
 * - ◀ ▶ buttons for 1-second adjustment
 * - Editable time display
 */
export default function DualRangeSlider({
  min,
  max,
  startVal,
  endVal,
  onStartChange,
  onEndChange,
  onSeek,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const range = max - min || 1;

  const pctStart = ((startVal - min) / range) * 100;
  const pctEnd = ((endVal - min) / range) * 100;

  const clamp = (v: number) => Math.round(Math.max(min, Math.min(max, v)));

  const getSecFromX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return min;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return clamp(min + pct * range);
    },
    [min, range]
  );

  const handlePointerDown = useCallback(
    (thumb: "start" | "end") => (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(thumb);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const sec = getSecFromX(e.clientX);
      if (dragging === "start") {
        const clamped = Math.min(sec, endVal - 1);
        onStartChange(clamp(clamped));
        onSeek?.(clamp(clamped));
      } else {
        const clamped = Math.max(sec, startVal + 1);
        onEndChange(clamp(clamped));
        onSeek?.(clamp(clamped));
      }
    },
    [dragging, startVal, endVal, getSecFromX, onStartChange, onEndChange, onSeek]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const nudge = useCallback(
    (thumb: "start" | "end", delta: number) => {
      if (thumb === "start") {
        const next = clamp(startVal + delta);
        if (next < endVal) {
          onStartChange(next);
          onSeek?.(next);
        }
      } else {
        const next = clamp(endVal + delta);
        if (next > startVal) {
          onEndChange(next);
          onSeek?.(next);
        }
      }
    },
    [startVal, endVal, onStartChange, onEndChange, onSeek]
  );

  // Long-press repeat for nudge buttons
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRepeat = useCallback(
    (thumb: "start" | "end", delta: number) => {
      nudge(thumb, delta);
      repeatRef.current = setInterval(() => nudge(thumb, delta), 200);
    },
    [nudge]
  );
  const stopRepeat = useCallback(() => {
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  }, []);
  useEffect(() => () => stopRepeat(), [stopRepeat]);

  return (
    <div className="space-y-2">
      {/* Time displays with nudge buttons */}
      <div className="flex items-center justify-between">
        <TimeControl
          value={startVal}
          onRepeatStart={(d) => startRepeat("start", d)}
          onRepeatStop={stopRepeat}
        />
        <span className="text-white/30 text-xs">
          {endVal - startVal}s
        </span>
        <TimeControl
          value={endVal}
          onRepeatStart={(d) => startRepeat("end", d)}
          onRepeatStop={stopRepeat}
        />
      </div>

      {/* Slider track */}
      <div
        ref={trackRef}
        className="relative h-8 flex items-center cursor-pointer touch-none select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Background track */}
        <div className="absolute left-0 right-0 h-1.5 rounded-full bg-white/10" />

        {/* Selected range */}
        <div
          className="absolute h-1.5 rounded-full bg-neon-blue"
          style={{ left: `${pctStart}%`, width: `${pctEnd - pctStart}%` }}
        />

        {/* Start thumb */}
        <div
          className="absolute w-5 h-5 rounded-full bg-neon-blue border-2 border-white shadow-lg
                     hover:scale-110 active:scale-95 transition-transform cursor-grab active:cursor-grabbing z-10"
          style={{ left: `calc(${pctStart}% - 10px)` }}
          onPointerDown={handlePointerDown("start")}
        />

        {/* End thumb */}
        <div
          className="absolute w-5 h-5 rounded-full bg-neon-blue border-2 border-white shadow-lg
                     hover:scale-110 active:scale-95 transition-transform cursor-grab active:cursor-grabbing z-10"
          style={{ left: `calc(${pctEnd}% - 10px)` }}
          onPointerDown={handlePointerDown("end")}
        />
      </div>

      {/* Min / Max labels */}
      <div className="flex justify-between text-[10px] text-white/30">
        <span>{formatTime(min)}</span>
        <span>{formatTime(max)}</span>
      </div>
    </div>
  );
}

function TimeControl({
  value,
  onRepeatStart,
  onRepeatStop,
}: {
  value: number;
  onRepeatStart: (delta: number) => void;
  onRepeatStop: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        className="w-7 h-7 flex items-center justify-center rounded text-white/50 hover:text-white/80
                   hover:bg-white/10 transition-colors"
        onPointerDown={() => onRepeatStart(-1)}
        onPointerUp={onRepeatStop}
        onPointerLeave={onRepeatStop}
        aria-label="1 second earlier"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-mono text-white/70 min-w-[3.5rem] text-center tabular-nums">
        {formatTime(value)}
      </span>
      <button
        className="w-7 h-7 flex items-center justify-center rounded text-white/50 hover:text-white/80
                   hover:bg-white/10 transition-colors"
        onPointerDown={() => onRepeatStart(1)}
        onPointerUp={onRepeatStop}
        onPointerLeave={onRepeatStop}
        aria-label="1 second later"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
