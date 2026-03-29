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
 */
export default function Subtitle({ cues, currentTime }: Props) {
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

  if (!activeCue) return null;

  // background-position: 100% = all white, 0% = all yellow
  const bgPos = `${100 - progress * 100}% 0`;

  return (
    <div className="w-full text-center py-4 px-4 -mt-16 relative z-10 backdrop-blur-md bg-black/50 rounded-b-lg">
      {/* Stroke layer */}
      <p
        className="text-3xl md:text-4xl font-black tracking-wider absolute inset-0 flex items-center justify-center px-4"
        style={{
          color: "transparent",
          WebkitTextStroke: "4px #000",
        }}
        aria-hidden="true"
      >
        {activeCue.text}
      </p>
      {/* Fill layer — direct sweep via backgroundPosition */}
      <p
        className="text-3xl md:text-4xl font-black tracking-wider relative subtitle-fill"
        style={{
          background: "linear-gradient(90deg, #ffe156 0%, #ffe156 50%, #fff 50%, #fff 100%)",
          backgroundSize: "200% 100%",
          backgroundPosition: bgPos,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
        }}
      >
        {activeCue.text}
      </p>
    </div>
  );
}
