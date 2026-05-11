# Gotchas

## Phase 0 (engine)

- **PRNG**: never `Math.random()`. Always the injected `Prng` (mulberry32). Otherwise tests are non-reproducible and game replay impossible.
- **Premium-square first occupation**: tracked in `GameState.consumedPremiums: ReadonlySet<CellKey>`. After a move, all newly-occupied premium cells get added. Subsequent moves crossing those cells do not re-apply the bonus.
- **Blank tiles**: distinct from letter tiles. After placement, `isBlank: true` and `letter` (chosen) are both set; `value` is always 0.
- **Cross-word scoring**: every tile placed may form a perpendicular cross-word ≥2 letters. Each cross-word formed (a) must be valid in the dictionary, (b) is scored.
- **Premium application order**: letter premium multiplies the tile's letter value BEFORE summing the word total; word premium multiplies AFTER. Multiple word premiums on one move stack (DW × DW = ×4).
- **Single-tile move**: a single-tile placement always forms a main word + at most one cross-word. The longer formed word is the "main" for tie-break; if equal, the horizontal one.
- **End conditions**: (a) tile bag empty AND one player's rack empty (rack-out), or (b) 4 consecutive passes (both players have passed twice in a row).

## Phase 1 (UI + storage)

- iPad Safari: `touch-action: manipulation` on buttons, `touch-action: none` on draggable tiles. `react-dnd` is broken on iOS Safari — use `@dnd-kit/core` (we do).
- @dnd-kit sensor config: `PointerSensor` with `distance: 8` and `TouchSensor` with `delay: 120, tolerance: 8`. Prevents taps from misfiring as drags. Tap-to-place also works in parallel.
- Storage: IndexedDB only via `idb`. localStorage gets evicted by iOS Safari ITP after 7 days idle.
- Tailwind v4: `@import "tailwindcss"`, not `@tailwind base/components/utilities`. Use `@tailwindcss/vite` plugin, not PostCSS (we do).
- 64 px minimum touch targets on rack tiles; board cells scale to fit the viewport (smaller targets are OK — tap-to-place handles precision).
- Animations capped at 300 ms (older user reflexes).
- **Vite dev gzip quirk**: `enable.txt.gz` is served with `Content-Encoding: gzip` and auto-decompressed by the browser. Our `loadDictionary` detects gzip magic bytes (`0x1f 0x8b`) and decompresses only if the server didn't. Both dev and production paths work.
- `exactOptionalPropertyTypes: true`: optional component props that may receive `undefined` must be typed `T | undefined` explicitly, not just `T?`. Otherwise React's JSX inference passes `undefined` and TS rejects.
