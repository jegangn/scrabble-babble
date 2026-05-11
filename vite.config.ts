import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png", "enable.txt.gz"],
      workbox: {
        // The ENABLE wordlist is ~700 KB gzipped; raise the default max so Workbox caches it.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,png,svg,gz,webmanifest}"],
      },
      manifest: {
        name: "Scrabble Babble",
        short_name: "Scrabble Babble",
        description: "Private Scrabble-style PWA gift.",
        display: "standalone",
        orientation: "landscape-primary",
        background_color: "#f5ede2",
        theme_color: "#7c4a2a",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
