import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { getLocale } from "./i18n";
import "./index.css";

// Set initial html lang attribute
document.documentElement.lang = getLocale();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Service Worker registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore */
    });
  });
}
