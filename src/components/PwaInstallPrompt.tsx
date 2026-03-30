import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/i18n";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "ear-sky-pwa-dismissed";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const eventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const t = useI18n();

  const hide = useCallback(() => {
    setVisible(false);
    setDeferredPrompt(null);
    eventRef.current = null;
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch {}

    const handler = (e: Event) => {
      e.preventDefault();
      eventRef.current = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const installedHandler = () => hide();

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [hide]);

  if (!visible || !deferredPrompt) return null;

  const handleInstall = async () => {
    const prompt = eventRef.current;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    hide();
  };

  return (
    <div className="animate-fade-in fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-white/15 px-5 py-3 backdrop-blur-md bg-bar-wall/90 shadow-lg shadow-black/40">
      <Download size={18} className="shrink-0 text-neon-pink" />
      <span className="flex-1 text-sm text-white/80">{t.pwa.installPrompt}</span>
      <button
        onClick={handleInstall}
        className="whitespace-nowrap rounded-lg bg-neon-pink/20 border border-neon-pink/40 px-4 py-1.5 text-sm font-bold text-neon-pink transition-colors hover:bg-neon-pink/30"
      >
        {t.pwa.installBtn}
      </button>
      <button
        onClick={hide}
        className="text-white/30 hover:text-white/60 transition-colors"
        aria-label={t.pwa.installDismiss}
      >
        <X size={16} />
      </button>
    </div>
  );
}
