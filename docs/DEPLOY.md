# Deploy

Scrabble Babble is a static PWA. No backend, no env vars, no secrets. Deploy to any free static host.

## Option A — GitHub Pages

1. Push the repo to GitHub.
2. In repo Settings → Pages, set "Source" to "GitHub Actions".
3. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and publishes `dist/` to the `gh-pages` branch.
4. The app will be available at `https://<user>.github.io/<repo>/`.

**Base path note:** `vite.config.ts` uses `base: "./"`. This works under any subpath, so GitHub Pages' `/repo-name/` prefix is handled automatically.

## Option B — Vercel

1. Import the repo on vercel.com.
2. Framework preset: **Vite**. Build command: `bun run build`. Output: `dist`.
3. Deploy.

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
