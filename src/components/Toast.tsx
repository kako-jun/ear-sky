import { useEffect, useState } from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";

interface Props {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}

export default function Toast({ message, type = "success", onClose }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const Icon = type === "error" ? AlertTriangle : CheckCircle;
  const borderColor = type === "error" ? "border-red-500/50" : "border-neon-blue/50";

  return (
    <div
      role="alert"
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-2 px-4 py-3 rounded-lg
        bg-bar-counter/95 backdrop-blur-md border ${borderColor}
        text-sm text-white shadow-lg
        transition-all duration-300
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}
      `}
    >
      <Icon size={16} className={type === "error" ? "text-red-400" : "text-neon-blue"} />
      {message}
    </div>
  );
}
