import { useEffect, useState } from "react";

interface Props {
  text: string;
  visible: boolean;
}

/**
 * 空耳テロップ — 番組風に下部からフェードインして表示
 * 白文字に黒縁取り、少し大きめ
 */
export default function Subtitle({ text, visible }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setShow(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [visible]);

  return (
    <div
      className={`
        w-full text-center py-3 px-4 -mt-14 relative z-10
        backdrop-blur-md bg-black/40 rounded-b-lg
        transition-all duration-500 ease-out
        ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      <p
        className="text-2xl md:text-3xl font-bold tracking-wider"
        style={{
          color: "#fff",
          textShadow:
            "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 0 8px rgba(0,0,0,0.8)",
        }}
      >
        {text}
      </p>
    </div>
  );
}
