import { useRef, useEffect, useState } from "react";
import { SubtitleCue } from "@/types";

interface Props {
  cues: SubtitleCue[];
  currentTime: number;
}

/**
 * Karaoke-style subtitle — progress driven directly by currentTime.
 *
 * Font size logic:
 * - Base size is text-3xl (1.875rem)
 * - If text overflows by a small margin (up to ~20%), shrink font to fit 1 line
 * - Beyond that, allow normal wrapping at the reduced floor size (1.25rem)
 */

const LEAD_SEC = 1.5;
const BASE_REM = 1.875;
const FLOOR_REM = 1.25;

export default function Subtitle({ cues, currentTime }: Props) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState(BASE_REM);
  const [lastText, setLastText] = useState("");

  if (cues.length === 0) return null;

  const firstShowAt = cues[0].showAt;
  const leadStart = firstShowAt - LEAD_SEC;

  let activeCue: SubtitleCue | null = null;
  let progress = 0;

  for (let i = cues.length - 1; i >= 0; i--) {
    const cue = cues[i];
    if (currentTime >= cue.showAt) {
      activeCue = cue;
      const elapsed = currentTime - cue.showAt;
      progress = cue.duration > 0 ? Math.min(1, elapsed / cue.duration) : 1;
      break;
    }
  }

  const displayText = activeCue?.text ?? cues[0].text;

  // Recalculate font size when text changes
  useEffect(() => {
    if (displayText === lastText) return;
    setLastText(displayText);

    const el = textRef.current;
    if (!el) { setFontSize(BASE_REM); return; }

    // Temporarily force nowrap + base size to measure single-line width
    const origWrap = el.style.whiteSpace;
    el.style.whiteSpace = "nowrap";
    el.style.fontSize = `${BASE_REM}rem`;
    const containerW = el.parentElement?.clientWidth ?? el.clientWidth;
    const textW = el.scrollWidth;
    el.style.whiteSpace = origWrap;

    if (textW <= containerW) {
      setFontSize(BASE_REM);
    } else {
      // Shrink proportionally, but not below floor — beyond that, let it wrap
      const scaled = BASE_REM * (containerW / textW);
      setFontSize(Math.max(FLOOR_REM, scaled));
    }
  }, [displayText, lastText]);

  let backdropOpacity = 0;
  if (currentTime >= firstShowAt) {
    backdropOpacity = 1;
  } else if (currentTime >= leadStart) {
    backdropOpacity = (currentTime - leadStart) / LEAD_SEC;
  }

  if (backdropOpacity <= 0 && !activeCue) return null;

  const bgPos = activeCue ? `${100 - progress * 100}% 0` : "100% 0";

  return (
    <div
      className="w-full text-center py-4 px-4 -mt-16 relative z-10 rounded-b-lg transition-none"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${0.5 * backdropOpacity})`,
        backdropFilter: `blur(${12 * backdropOpacity}px)`,
        WebkitBackdropFilter: `blur(${12 * backdropOpacity}px)`,
      }}
    >
      <p
        ref={textRef}
        className="font-black tracking-wider relative"
        style={{
          fontSize: `${fontSize}rem`,
          background: "linear-gradient(90deg, #fff 0%, #fff 49%, rgba(255,255,255,0.5) 50%, transparent 51%, transparent 100%)",
          backgroundSize: "200% 100%",
          backgroundPosition: bgPos,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          opacity: backdropOpacity,
        }}
      >
        {displayText}
      </p>
    </div>
  );
}
