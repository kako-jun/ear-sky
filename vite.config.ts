import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { writeFileSync, readFileSync } from "fs";

const buildDate = new Date().toISOString().slice(0, 10);

// Replace __BUILD_DATE__ in sw.js at build time
if (process.env.NODE_ENV === "production") {
  const swPath = path.resolve(__dirname, "public/sw.js");
  const sw = readFileSync(swPath, "utf-8");
  writeFileSync(swPath, sw.replace("__BUILD_DATE__", buildDate));
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
