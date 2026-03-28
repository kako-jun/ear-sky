import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { migrateReactionsStorage } from "@/lib/storage";
import "./index.css";

// Migrate old array-based reaction localStorage to new single-emoji format
migrateReactionsStorage();

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
