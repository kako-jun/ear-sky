import { SubtitleCue } from "@/types";

interface Props {
  cues: SubtitleCue[];
  currentTime: number;
}

/**
 * Karaoke-style subtitle — progress driven directly by currentTime.
 * No CSS animation, no setTimeout, no state machine.
 * Multiple cues supported; the active one is determined by currentTime.
 * After a cue's sweep completes, text remains visible (bar-style residual).
 *
 * The backdrop bar fades in LEAD_SEC before the first cue starts,
 * using an opacity ramp so it appears smoothly rather than popping in.
 */

const LEAD_SEC = 1.5; // backdrop starts fading in this many seconds before the first cue

export default function Subtitle({ cues, currentTime }: Props) {
  if (cues.length === 0) return null;

  const firstShowAt = cues[0].showAt;
  const leadStart = firstShowAt - LEAD_SEC;

  // Find the latest cue that has started (for residual display)
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

  // Backdrop opacity: ramp from 0 to 1 over LEAD_SEC before the first cue
  let backdropOpacity = 0;
  if (currentTime >= firstShowAt) {
    backdropOpacity = 1;
  } else if (currentTime >= leadStart) {
    backdropOpacity = (currentTime - leadStart) / LEAD_SEC;
  }

  // Not yet in the lead-in zone and no cue has played
  if (backdropOpacity <= 0 && !activeCue) return null;

  // background-position: 100% = all transparent, 0% = all white
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
      {/* Fill layer — transparent text swept to white */}
      <p
        className="text-3xl md:text-4xl font-black tracking-wider relative"
        style={{
          background: "linear-gradient(90deg, #fff 0%, #fff 49%, rgba(255,255,255,0.5) 50%, transparent 51%, transparent 100%)",
          backgroundSize: "200% 100%",
          backgroundPosition: bgPos,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          opacity: backdropOpacity,
        }}
      >
        {activeCue?.text ?? cues[0].text}
      </p>
    </div>
  );
}
