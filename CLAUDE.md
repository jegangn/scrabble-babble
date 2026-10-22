# Scrabble Babble

Private Scrabble-style PWA gift for father-in-law's iPad. Solo (vs AI) + hot-seat. No backend, no accounts, no network after first load. RM0 infrastructure forever.

**Owner:** Jegan — product owner, non-coding founder.
**Lead engineer:** Claude Code.
**Target user:** Father-in-law, older user, iPad landscape primary.

## Locked Constraints

- Internal name: **Scrabble Babble** — exported as `APP_NAME` in `src/config/branding.ts`. Never hardcode the name elsewhere.
- Stack: Vite + React 18 + TypeScript (strict) + Tailwind v4 via `@tailwindcss/vite` + Zustand + `@dnd-kit/core` + `idb` + Vitest + Web Worker (AI bot).
- Deployment: Vercel free tier, static only; auto-deploys on push to `main` (`vercel.json` = SPA rewrite). The GitHub Pages workflow was removed (`9116d7a`).
- No WSL. Scripts cross-platform: no bash, no `&&` chains in package.json scripts (use `npm-run-all` if needed).
- Storage: IndexedDB via `idb` only — never localStorage (iOS Safari ITP evicts after 7 days).
- Engine purity: `src/engine/` has zero React/DOM/storage/network imports. Enforced by `bun run lint:engine-purity`.
- Board layout (original, 4-fold symmetric) and WWF-inspired tile values are legally distinct from Hasbro Scrabble. Dictionary is **Collins CSW21** (HarperCollins-copyrighted; used via the `scrabblewords` redistribution) — a deliberate owner override of the original public-domain-ENABLE constraint. See `docs/IP_DIVERGENCES.md`.

## Target devices

- **Primary:** the father-in-law's 12.9" iPad Pro 5th gen, always landscape. PWA (home screen) = 1366×1024 CSS px; Mobile Safari = 1366×~880. Every big-screen layout must fit 1366×880. Keep `100dvh` + `safe-area-inset-bottom` so the home indicator doesn't crowd controls like Resign.
- **iPad Air and smaller touch screens** (landscape, ≤1280 px wide): `src/ui/FitToViewport.tsx` renders the fixed 1366×880 canvas zoomed to fit (~0.80–0.86× on the Air). The Pro (1366) and laptops never activate it.
- **Phones in portrait:** `src/ui/DeviceRouter.tsx` routes to the separate `src/ui/phone/` screens (additive; big screens unchanged). A phone held landscape falls through to `FitToViewport`. Details in `docs/GOTCHAS.md` ("Phase 5").

## Status and workflow

All phases are done: 0 engine (pure TS, ≥90% coverage), 1 hot-seat iPad PWA + IndexedDB, 2 AI bot (Easy/Medium/Hard) in a Web Worker, 3 Random-board + Mini 11×11, 4 Tumbler + Spelling Bee, 5 phone portrait port.

1. Conventional commits, one commit per logical chunk.
2. Ship only when `bun run test` is green and `bun run typecheck` has zero errors.
3. Scope creep goes to `docs/BACKLOG.md`.

## Documentation

- @docs/ARCHITECTURE.md — engine layering, module boundaries, data flow
- @docs/BUILD.md — toolchain, scripts, how to run tests and ship
- @docs/GOTCHAS.md — iPad Safari, Tailwind v4, drag-drop traps
- @docs/IP_DIVERGENCES.md — how Scrabble Babble differs from Scrabble/WWF
- @docs/VARIANTS.md — Classic, Random, Mini, Tumbler, Spelling Bee rule deltas
- @docs/BACKLOG.md — deferred ideas
- @docs/DEPLOY.md — deploy instructions (its GitHub Pages option is stale; Vercel is live)
