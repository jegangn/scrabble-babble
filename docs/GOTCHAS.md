# Gotchas

## Phase 0 (engine)

- **PRNG**: never `Math.random()`. Always the injected `Prng` (mulberry32). Otherwise tests are non-reproducible and game replay impossible.
- **Premium-square first occupation**: tracked in `GameState.consumedPremiums: ReadonlySet<CellKey>`. After a move, all newly-occupied premium cells get added. Subsequent moves crossing those cells do not re-apply the bonus.
- **Blank tiles**: distinct from letter tiles. After placement, `isBlank: true` and `letter` (chosen) are both set; `value` is always 0.
- **Cross-word scoring**: every tile placed may form a perpendicular cross-word ≥2 letters. Each cross-word formed (a) must be valid in the dictionary, (b) is scored.
- **Premium application order**: letter premium multiplies the tile's letter value BEFORE summing the word total; word premium multiplies AFTER. Multiple word premiums on one move stack (DW × DW = ×4).
- **Single-tile move**: a single-tile placement always forms a main word + at most one cross-word. The longer formed word is the "main" for tie-break; if equal, the horizontal one.
- **End conditions**: (a) tile bag empty AND one player's rack empty (rack-out), or (b) 4 consecutive passes (both players have passed twice in a row).

## Phase 1+ (foreshadow — not implemented yet)

- iPad Safari: `touch-action: manipulation` on buttons, `touch-action: none` on tiles being dragged. `react-dnd` is broken on iOS Safari — use `@dnd-kit/core`.
- Storage: IndexedDB only via `idb`. localStorage gets evicted by iOS Safari ITP after 7 days idle. Call `navigator.storage.persist()` on first run and toast if denied.
- Tailwind v4: `@import "tailwindcss"`, not `@tailwind base/components/utilities`. Use `@tailwindcss/vite` plugin, not PostCSS.
- 96 px minimum touch targets on rack tiles; 64 px minimum on board cells. 18 pt body, 24 pt board tiles, system-ui / SF Pro.
- Animations capped at 300 ms (older user reflexes).
