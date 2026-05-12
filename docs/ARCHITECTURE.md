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
    ai/                     — Phase 2 bot (pure, deterministic)
      cross-checks.ts       — anchor discovery + per-cell allowed-letter sets
      move-generator.ts     — Appel & Jacobson (1988) generator → CandidateMove[]
      leave-eval.ts         — per-letter rack-leave values (Quackle-inspired)
      bot.ts                — decide(state, dict, difficulty, opts?) → Move
    __tests__/              — Vitest specs
    __fixtures__/           — reusable scenarios + 500-word dict subset
  ui/                       — React layer (screens + components)
  storage/                  — IndexedDB adapter (idb)
  store/                    — Zustand state + pending-placement helpers
  ai-client/                — botClient: promise-based wrapper around the worker
  workers/                  — bot.worker.ts + bot-protocol.ts (shared message types)
  data/                     — load-dictionary.ts (fetches enable.txt.gz)
```

## Invariants

- All engine functions are pure: `readonly` inputs, return new state objects.
- All randomness flows through an injected seeded `Prng`. Tests replay any game by replaying its seed and moves.
- No `any`. No unjustified `as` casts. Discriminated unions for `Move`, `ValidationError`, `EndReason`.
- Premium-cell consumption is stored in `GameState.consumedPremiums: ReadonlySet<CellKey>` so first-occupation rule is enforced statefully.
- Blank tiles are distinct from letter tiles: `{ isBlank: true, letter }` with `value: 0`.

## Data Flow

UI → dispatched action → engine pure function → new state → Zustand store → IndexedDB persistence via `idb`.

The engine never knows about React, the DOM, storage, or the network.

## AI Layer (Phase 2)

The bot lives entirely in `src/engine/ai/` (pure) and runs inside a Web Worker bundled by Vite's `?worker` import suffix. The boundary:

```
GameScreen (effect on turn change)
   ↓ getBotMove(state, difficulty)
ai-client/botClient.ts  ─ postMessage(decide) ─→  workers/bot.worker.ts
                        ←─ postMessage(decided) ─                ↑
                                                  fetches enable.txt.gz
                                                  builds trie, calls
                                                  engine/ai/bot.ts:decide
```

Message protocol (`src/workers/bot-protocol.ts`):
- `{ kind: "init", baseUrl }` → worker fetches the dictionary
- `{ kind: "decide", id, serializedState, difficulty, deadline }` → worker decides
- `{ kind: "ready" }` / `{ kind: "decided", id, move }` / `{ kind: "error", id, message }` come back

The client lazy-spawns one worker, bounds each call to 4 800 ms, and lets the bot's own deadline expire 200 ms sooner so a best-found move comes back before the client times out.

## Why this layering

If the engine is pure, every variant (Classic, Random, Mini, Tumbler, Spelling Bee, AI difficulty) reuses it with injected config. The AI Web Worker imports only `src/engine/` plus the small `data/` and `storage/serializer` helpers, so the worker chunk stays under ~20 KB gzip.
