# Deploy

Scrabble Babble is a static PWA. No backend, no env vars, no secrets. Deploy to any free static host.

## Vercel (the live site)

Vercel builds from GitHub: every push to `main` goes live. Settings: framework preset **Vite**, build command `bun run build`, output `dist`.

The GitHub Pages workflow was removed in May 2026 (`9116d7a`); Vercel is the only host. `vite.config.ts` uses `base: "./"`, so the build also works under a subpath.

## Local preview

```bash
bun run build
bun run preview
```

Open `http://localhost:4173`. The service worker caches everything on first load, so subsequent loads work offline.

## iPad install

1. Open the deployed URL in iPad Safari.
2. Share → "Add to Home Screen".
3. Launch from the home screen icon. The app opens fullscreen, no Safari chrome.

## Offline & cache

`vite-plugin-pwa` (Workbox under the hood) caches the app shell + assets + CSW21 wordlist on first visit. After that, the app loads offline.

When you ship a new version: bump nothing; the SW with `registerType: "autoUpdate"` auto-detects the new build and refreshes on next visit.
