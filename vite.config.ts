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
      includeAssets: ["icons/apple-touch-icon.png", "csw21.txt.gz"],
      workbox: {
        // The CSW21 wordlist is ~710 KB gzipped; raise the default max so Workbox caches it.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,png,svg,gz,webmanifest}"],
      },
      manifest: {
        name: "Scrabble Babble",
        // short_name follows the design-handoff spec — chosen for the
        // home-screen icon label where space is tight.
        short_name: "Scrabble",
        description: "Private Scrabble-style PWA gift.",
        display: "standalone",
        orientation: "landscape-primary",
        // background_color + theme_color now match the new HomeScreen
        // cream palette (was the older warm-brown). Keeps the install /
        // splash screen visually consistent with the redesign.
        background_color: "#F1E5CF",
        theme_color: "#F1E5CF",
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
