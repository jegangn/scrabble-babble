# Architecture

## Layering

```
src/
  config/branding.ts        — single source of truth for APP_NAME
  engine/                   — PURE TypeScript (no React/DOM/storage/network)
    types.ts                — readonly types + discriminated unions
    prng.ts                 — mulberry32 seeded PRNG
    config/
      board.ts              — 15×15 premium layout (4-fold symmetric)
      tiles.ts              — 104-tile distribution
      rules.ts              — bingo bonus, rack size, end-condition limits
    board.ts                — board ops (immutable)
    tilebag.ts              — bag ops with injected PRNG
    rack.ts                 — rack ops
    move.ts                 — move construction + word extraction
    dictionary.ts           — trie + lookup
    validator.ts            — legality checks
    scorer.ts               — score calculation
    game.ts                 — game state machine
    debug.ts                — ASCII grid render for tests/debug
    __tests__/              — Vitest specs
    __fixtures__/           — reusable scenarios + 500-word dict subset
  ui/                       — phase 1+ React layer (not in phase 0)
  storage/                  — phase 1+ IndexedDB adapter
  workers/                  — phase 2+ AI Web Worker
```

## Invariants

- All engine functions are pure: `readonly` inputs, return new state objects.
- All randomness flows through an injected seeded `Prng`. Tests replay any game by replaying its seed and moves.
- No `any`. No unjustified `as` casts. Discriminated unions for `Move`, `ValidationError`, `EndReason`.
- Premium-cell consumption is stored in `GameState.consumedPremiums: ReadonlySet<CellKey>` so first-occupation rule is enforced statefully.
- Blank tiles are distinct from letter tiles: `{ isBlank: true, letter }` with `value: 0`.

## Data Flow (Phase 1+ preview)

UI → dispatched action → engine pure function → new state → Zustand store → IndexedDB persistence via `idb`.

The engine never knows about React, the DOM, storage, or the network.

## Why this layering

If the engine is pure, every variant (Classic, Random, Mini, Tumbler, Spelling Bee, AI difficulty) reuses it with injected config. The AI Web Worker imports only `src/engine/`, so the worker stays small and fast.
