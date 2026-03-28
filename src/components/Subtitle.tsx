import { useEffect, useRef, useState } from "react";

interface Props {
  text: string;
  visible: boolean;
  durationSec?: number;
}

/**
 * 空耳テロップ — 番組風に下部からフェードイン
 * 白→黄色のカラオケ風スイープ + 太い黒縁取り
 */
export default function Subtitle({ text, visible, durationSec }: Props) {
  const sweepDuration = durationSec ? Math.max(1, durationSec - 0.5) : 3;
  const [show, setShow] = useState(false);
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      // Rising edge: visible went false→true, start new sweep
      setShow(false);
      const timer = setTimeout(() => setShow(true), 300);
      prevVisibleRef.current = true;
      return () => clearTimeout(timer);
    }
    if (!visible) {
      prevVisibleRef.current = false;
      // Don't hide — subtitle stays visible after sweep
    }
  }, [visible]);

  return (
    <div
      className={`
        w-full text-center py-4 px-4 -mt-16 relative z-10
        backdrop-blur-md bg-black/50 rounded-b-lg
        transition-all duration-500 ease-out
        ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      {/* Stroke layer (behind) */}
      <p
        className="text-3xl md:text-4xl font-black tracking-wider absolute inset-0 flex items-center justify-center px-4"
        style={{
          color: "transparent",
          WebkitTextStroke: "4px #000",
        }}
        aria-hidden="true"
      >
        {text}
      </p>
      {/* Fill layer (front) — karaoke sweep */}
      <p
        className={`text-3xl md:text-4xl font-black tracking-wider relative ${show ? "subtitle-sweep" : ""}`}
        style={{
          textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
          animationDuration: show ? `${sweepDuration}s` : undefined,
        }}
      >
        {text}
      </p>
    </div>
  );
}
