# Scrabble Babble

Private Scrabble-style PWA gift for father-in-law's iPad. Solo (vs AI) + hot-seat. No backend, no accounts, no network after first load. RM0 infrastructure forever.

**Owner:** Jegan — product owner, non-coding founder.
**Lead engineer:** Claude Code.
**Target user:** Father-in-law, older user, iPad landscape primary.

## Locked Constraints

- Internal name: **Scrabble Babble** — exported as `APP_NAME` in `src/config/branding.ts`. Never hardcode the name elsewhere.
- Stack: Vite + React 18 + TypeScript (strict) + Tailwind v4 via `@tailwindcss/vite` + Zustand + `@dnd-kit/core` + `idb` + Vitest + Web Worker (AI in Phase 2+).
- Deployment: GitHub Pages or Vercel free tier, static only.
- Windows 11 host, no WSL. Scripts cross-platform: no bash, no `&&` chains in package.json scripts (use `npm-run-all` if needed).
- Package manager: **bun**.
- Storage: IndexedDB via `idb` only — never localStorage (iOS Safari ITP evicts after 7 days).
- Engine purity: `src/engine/` has zero React/DOM/storage/network imports. Enforced by `bun run lint:engine-purity`.
- Legally distinct from Hasbro Scrabble: original board layout (4-fold symmetric), WWF-inspired tile values, ENABLE dictionary.
- Defaults: MYR, metric, dd/MM/yyyy, +60 phones, UTC+8.

## Phase Status

| # | Phase | Status |
|---|-------|--------|
| 0 | Engine (pure TS, ≥90% test coverage) | ✅ done |
| 1 | Hot-seat iPad PWA + IndexedDB | ✅ done |
| 2 | AI bot (Easy/Medium/Hard) in Web Worker | ⏸ pending |
| 3 | Random-board + Mini 11×11 variants | ⏸ pending |
| 4 | Tumbler + Spelling Bee | ⏸ pending |

## Workflow

1. Plan Mode before each phase. Wait for explicit "next" between phases.
2. TDD. Conventional commits. One commit per logical chunk.
3. No phase advances until `bun run test` is green and `bun run typecheck` has zero errors.
4. Scope creep goes to `docs/BACKLOG.md`, never into the current phase.

## Documentation

- @docs/ARCHITECTURE.md — engine layering, module boundaries, data flow
- @docs/BUILD.md — toolchain, scripts, how to run tests and ship
- @docs/GOTCHAS.md — iPad Safari, Tailwind v4, drag-drop traps
- @docs/IP_DIVERGENCES.md — how Scrabble Babble differs from Scrabble/WWF
- @docs/VARIANTS.md — Classic, Random, Mini, Tumbler, Spelling Bee rule deltas
- @docs/BACKLOG.md — deferred ideas
- @docs/DEPLOY.md — GitHub Pages / Vercel deploy instructions
