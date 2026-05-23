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
- **Vite dev gzip quirk**: `csw21.txt.gz` is served with `Content-Encoding: gzip` and auto-decompressed by the browser. Our `loadDictionary` detects gzip magic bytes (`0x1f 0x8b`) and decompresses only if the server didn't. Both dev and production paths work.
- `exactOptionalPropertyTypes: true`: optional component props that may receive `undefined` must be typed `T | undefined` explicitly, not just `T?`. Otherwise React's JSX inference passes `undefined` and TS rejects.

## Phase 2 (AI bot + Web Worker)

- **Web Worker bundling**: import the worker via Vite's `?worker` suffix (`import BotWorker from "../workers/bot.worker.ts?worker"`). This emits a separate chunk lazily loaded on `new BotWorker()`. Without `?worker`, Vite inlines the file into the main bundle.
- **Tree-shaking gotcha**: if nothing in the React tree imports `botClient`, Vite never traverses to the `?worker` import and silently skips emitting the worker chunk. Smoke-test by checking `dist/assets/` after a build — `bot.worker-*.js` must be present.
- **Worker globals**: the WebWorker lib conflicts with our DOM lib, so we don't pull it in. Instead, the worker uses a locally-declared structural type for `self` (`postMessage`, `addEventListener("message")`, `location.href`). All structurally compatible.
- **`document.baseURI` is undefined in workers**: the worker can't resolve relative URLs the way the main thread can. The client passes `document.baseURI` in the `init` message so the worker knows where to fetch `csw21.txt.gz`.
- **Dictionary lives once per worker**: `loadDictionary` is called once and the resulting trie is held in worker module scope. Subsequent `decide` calls reuse it. The service-worker cache makes the second load instantaneous (offline-friendly).
- **Bot deadline vs client timeout**: the client times out at 4 800 ms, but tells the bot to stop at 4 600 ms (`internalDeadline = now + timeoutMs - 200`). This 200 ms buffer ensures the bot returns its best-so-far move before the client gives up.
- **React strict-mode double-fire**: React 18 dev mode mounts effects twice. The AI driver effect uses a `cancelled` flag in its cleanup so the second async resolution is a no-op. A redundant `getBotMove` call goes to the worker in dev only.
- **Skipping handoff for AI turns**: the store's `applyPostMoveTransition` peeks at `aiPlayerIndex` and emits `screen: { kind: "game" }` (no handoff overlay) when the next player is the bot. The GameScreen effect picks it up automatically.
- **`hydrate` infers AI mode from settings**: when resuming an in-progress game, we read `settings.opponent` to set `aiPlayerIndex`. Settings always reflect the last-picked opponent for the most recently started game.

## Phase 3 (board variants)

- **4-fold rotational orbits**: on an odd-sized square (15 or 11), the centre `(c,c)` is the only fixed point of `(r,c) → (c, size-1-r)`. Every other cell belongs to an orbit of size 4. Random-board generation works at the orbit level — assigning a premium to one orbit means assigning it to 4 cells at once, so symmetry is invariant by construction.
- **Random-board safety pins**: the corner orbit is force-assigned TW (so corners always feel Classic), and the two orbits orthogonally/diagonally adjacent to the centre are blocked from TW (a TW one cell from the centre DW lets a 2-tile opener stack TW × DW for a 6× word multiplier on the very first move). Rejection rate is tiny; the shuffle pool is large.
- **`GameState.variant` is the source of truth**: the variant tag is stamped onto the game itself, not just settings. Export/import a saved game and the right variant comes back. Settings only remember the *last-picked* choice for the New Game default.
- **Legacy saves**: pre-Phase-3 in-progress games don't have a `variant` field. `deserializeGame` defaults it to `"classic"` so older saves still resume cleanly. Covered by `serializer.test.ts`.
- **No IndexedDB schema bump**: settings is keyed `{ key, value }`, so adding a new `"variant"` key is additive — no DB version bump needed.

## Phase 4 (solo minigames)

- **No new IndexedDB stores**: Tumbler best + Bee daily progress both live in the existing `settings` store. Bee uses per-day keys like `bee_progress_2026-05-12` so each day is a separate row — easy to inspect, no migration.
- **Bee daily key is *local* time, not UTC**: `localDateKey()` formats from `Date.getFullYear/getMonth/getDate`. The father-in-law sees a new puzzle at local midnight; he won't notice the difference unless he travels (he won't).
- **Bee pangram cache**: `enumerateSevenLetterPangrams(dict)` walks the trie once (~50–200 ms) and caches the result per-trie-reference at module scope. HomeScreen pre-warms this on mount with a 200 ms debounce so tapping "Spelling Bee" feels instant. Bee screen re-calls the function defensively (cheap cache hit) on hot-reload paths.
- **S-exclusion**: pangrams containing 'S' are skipped entirely. Without it, every word has a `+S` plural — `enumerateBeeWords` returns 3-5× more answers, scoring inflates, and the daily list feels overwhelming. NYT convention; we follow.
- **Tumbler pause-on-blur**: `document.visibilitychange` listener banks elapsed time into a ref when the tab hides, resumes from the banked value when it comes back. Otherwise tapping out to read a notification burns the clock.
- **Tumbler timer starts on first keystroke**: gives him time to read the rack. If he never types, the timer never starts. (No grace timeout — he can pause as long as he likes.)
- **Tumbler scoring formula**: `(Σ letter values) × word length` is mathematically equivalent to `Σ (value × length)`. Both spellings appear in the spec; we implement the former because it matches the per-tile mental model.
- **Hex layout**: 6 outer letter pills positioned at pointy-top angles (90° / 150° / 210° / 270° / 330° / 30°) in a 320×320 absolute-positioned container. Pill size 80 px. Shuffle button rotates the outer order by one — deterministic, cheap, visually pleasing.

## Post-launch (5-tier AI difficulty)

- **Legacy difficulty migration**: pre-5-tier saves stored `easy`/`medium`/`hard` in the settings store. `getOpponent()` in `settings-storage.ts` runs the value through `migrateLegacyDifficulty()` on the way out, so the rest of the codebase only ever sees the new 5-tier IDs (`friendly`/`easygoing`/`steady`/`sharp`/`master`). If you add a new tier, also extend the type guards in `settings-storage.ts` AND `migrateLegacyDifficulty()` — both list every tier explicitly.
- **`maxTilesPlaced` is the headline natural-feel lever**: Friendly/Easygoing's cap on rack-tiles-placed-per-move physically prevents bingos and long-word power plays. Don't try to "improve" Friendly by removing the cap — the cap *is* the feature. If even the top candidate scores below `FALLBACK_SCORE_FLOOR` (5), the bot swaps low-leave tiles instead.
- **Pick-style uses base scores for weighting, not utility**: leave-eval and lookahead can drive utility negative; using utility as weights breaks the positive-weight assumption of `weightedPick()`. We weight by `Math.max(1, c.total)` instead, which keeps the score-bias intact.
- **Sharp/Master deadline guard**: if the worker's deadline has already elapsed when `decide()` runs (stale queued message), the lookahead loop would otherwise produce an empty `scored` array and crash on `pool[0]`. Falls back to base-score ordering in that case so the bot always returns *something*.

## Post-launch (iPad Air fit)

- **Every screen must pin to `var(--app-h)` or it clips on the Air**: `FitToViewport` renders a fixed `1366×880` canvas inside an `overflow:hidden` shell that *cannot scroll* (that's how it scales). Any screen whose content can grow taller than 880 (e.g. `Surface` with `minHeight:100%`) scrolls fine on the Pro but gets silently clipped on the Air. The `TumblerEndScreen` "Words you found" list had no height bound and clipped the Restart / Play-again buttons at ~30+ found words. Fix: wrap content in a `height:var(--app-h); overflow:hidden; flex column` container (same as the in-game `TumblerScreen`) and let inner lists scroll. Guarded by `e2e/tumbler-endscreen-fit.spec.ts`.
- **Bounded-but-compact columns**: in a height-pinned grid, a column that should stay content-sized for small data yet scroll for large data needs `alignSelf:start` (content height, no empty stretch) **plus** `maxHeight:100%` (caps at the row track, so a `flex:1, minHeight:0` child scrolls when it overflows). Stretching the column instead reintroduces the empty-space-under-the-list look. Requires `gridTemplateRows: minmax(0, 1fr)` so the `100%` resolves against a definite track.
- **Playwright clock + `Date.now()`-derived seeds**: `page.clock.install({ time })` keeps *ticking in real time* after install, so a value read seconds later (e.g. Tumbler's `Date.now() & 0x7fffffff` rack seed at mount) is non-deterministic. Use `page.clock.pauseAt(T)` to freeze `Date.now()` at exactly `T`; `pauseAt` only fast-forwards, so pick a **future** `T` (e.g. `900 * 2**31 + seed`, whose low 31 bits are the seed) and then `fastForward()` to drive timers.
