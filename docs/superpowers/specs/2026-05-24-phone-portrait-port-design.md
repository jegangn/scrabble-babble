# Phone Portrait Port — Design Spec

**Date:** 2026-05-24
**Status:** Draft for owner review
**Phase:** 5 — Phone (new)

## Goal

Add a native, portrait-first phone experience to Scrabble Babble — every screen, including the 15×15 board game — **without changing a single pixel of the existing layout** on laptop, Samsung tablet, iPad Pro, or iPad Air.

## Background — why this is needed

The whole app renders a fixed **1366×880 landscape canvas**. `FitToViewport` (`computeAirFit`) only activates on `isTouch && landscape && vw ≤ 1280`, scaling that canvas down for the iPad Air. On a phone today:

- **Portrait** (how phones are held): the board game shows a *"Rotate to landscape"* wall (`@media (orientation: portrait) and (max-width: 600px)` in `GameScreen.tsx`); the other screens overflow.
- **Landscape**: the existing Air scaler kicks in and shrinks the full 1366×880 canvas to ~0.44× — everything shows, just small.

Scaling a 1366px-wide layout to a 390px phone makes board cells ~7px — unusable. A phone needs a genuinely different **vertical** layout, not a shrink.

Portrait was deliberately out of scope until now (target device is the father-in-law's iPad). This spec reopens portrait **only for phones**.

## Locked decisions (from owner)

1. **Full portrait port** — every screen redesigned for portrait, board game included.
2. **Support both orientations on a phone** — portrait uses the new layout; landscape falls back to today's shrink-to-fit view (already works).

## Open item for review

- **Mini 11×11 as the phone default variant.** On a 390px phone, 15×15 cells are ~24px (tight but standard for mobile Scrabble); Mini cells are ~33px (comfortable). Proposal: when on a phone, default New Game's variant to **Mini**, with Classic/Random still selectable. *Owner to confirm — does not block the rest of the spec.*

---

## Architecture

### Principle: the phone path is purely additive

The existing screens are **never rendered** on a phone-in-portrait, so the iPad/laptop UI is structurally impossible to regress. Everything shared sits *below* the screen layer:

- **Shared, untouched:** Zustand store (`gameStore`), the entire `engine/`, AI client + worker, IndexedDB storage, and the already-responsive leaf components (`Board`, `BoardCell`, `Tile`, modals: `ModalFrame`, `SwapPicker`, `BlankLetterPicker`, `HotSeatHandoff`, `ThinkingOverlay`).
- **New:** a parallel set of portrait screen shells under `src/ui/phone/`, plus a top-level router.

Phone work is layout only — almost no logic is duplicated, because game logic lives in the store and engine.

### Top-level routing

`main.tsx` renders a new `<DeviceRouter/>` instead of `<FitToViewport><App/></FitToViewport>`.

```
function DeviceRouter() {
  useBootstrap();                       // dictionary, settings, in-progress load (extracted from App)
  const { isPhone, portrait } = useDeviceClass();
  if (isPhone && portrait) return <PhoneApp />;          // NEW path
  return <FitToViewport><App /></FitToViewport>;          // existing path, unchanged
}
```

- `useBootstrap()` — the two boot `useEffect`s currently inside `App.tsx` are extracted into this shared hook so they run **once**, regardless of which path renders. `App.tsx` keeps only its screen `switch`. This is a mechanical refactor with identical behaviour, guarded by the existing test suite. `PhoneApp.tsx` has its own `switch` over the same store `screen` state.
- The Zustand store is global, so rotating a phone (swapping `PhoneApp` ↔ `FitToViewport→App`) **preserves all state** — the in-progress game, scores, even pending (un-submitted) tiles survive the rotation. An in-flight drag cancels on the swap (acceptable edge).

### Device classification — `src/ui/deviceClass.ts` (pure, unit-tested like `airFit.ts`)

```
PHONE_MAX_SHORT_SIDE = 540

classifyDevice({ vw, vh, isTouch }):
  shortSide = min(vw, vh)
  isPhone   = isTouch && shortSide <= PHONE_MAX_SHORT_SIDE
  portrait  = vh >= vw
  return { isPhone, portrait }
```

Rationale for 540: phones top out at ~430px short side (iPhone Pro Max); the smallest tablets start ~600px (iPad mini is 744). 540 sits cleanly between with margin. `isTouch` reuses the existing `(any-pointer: coarse)` check, so **a mouse/trackpad laptop never takes the phone path**, even in a narrow window.

`useDeviceClass()` wraps `classifyDevice` with `resize` + `orientationchange` listeners (same pattern as `FitToViewport`).

### Routing table

| Device | Orientation | Path | Status |
|---|---|---|---|
| Laptop / desktop (no touch) | any | `FitToViewport` (inactive) → `App` | unchanged |
| iPad Pro 1366 / Samsung tablet | landscape | `FitToViewport` (inactive) → `App` | unchanged |
| iPad Air 1180 | landscape | `FitToViewport` (active, scaled) → `App` | unchanged |
| Tablet | portrait | `FitToViewport` (inactive) → `App` (existing reflow) | unchanged |
| **Phone** | **portrait** | **`PhoneApp` (NEW)** | **new** |
| Phone | landscape | `FitToViewport` (active, scaled) → `App` | unchanged |

Phone-portrait is the **only** new branch.

### File structure

```
src/ui/
  deviceClass.ts                 — pure classify() + constants  (+ deviceClass.test.ts)
  useDeviceClass.ts              — viewport hook (resize/orientation)
  DeviceRouter.tsx               — phone+portrait → PhoneApp, else existing path
  useBootstrap.ts                — boot effects extracted from App.tsx
  hooks/
    usePendingPreview.ts         — shared derived value (was inline in GameScreen)
    useLastMove.ts               — shared derived value (was inline in GameScreen)
  phone/
    PhoneApp.tsx                 — screen switch (mirrors App.tsx)
    PhoneShell.tsx               — portrait frame: safe-area insets, paper grain, top bar slot
    components/
      PhoneTopBar.tsx            — back · title · trailing context (tiles-left / user chip)
      PhoneActionBar.tsx         — bottom action row for the board game
      PhoneNavButton.tsx         — full-width home menu button
    screens/
      PhoneHome.tsx
      PhoneNewGame.tsx
      PhoneGame.tsx
      PhoneGameEnd.tsx
      PhoneTumbler.tsx
      PhoneTumblerEnd.tsx
      PhoneSpellingBee.tsx
      PhoneScores.tsx
```

`App.tsx`, `FitToViewport.tsx`, `airFit.ts` change only minimally (App loses its effects to `useBootstrap`; the other two are untouched). `LoadingScreen` is reused as-is on both paths.

---

## Per-screen design

All phone screens pin to `height: var(--app-h)` (= `100dvh` on the phone path) with `overflow: hidden` and let inner lists scroll — the same discipline the in-game `TumblerScreen` already uses. Safe-area insets (`env(safe-area-inset-*)`) are honoured in the top bar and action bar so nothing hides behind the notch or home indicator. Each screen's visuals are produced with the **ui-ux-pro-max** skill (mobile spacing, ≥44px targets, interaction states) and reuse the existing design tokens.

### PhoneGame — the board game (the hard one)

```
┌────────────────────────┐  phone portrait (~390 × 844)
│ ←  Classic 15×15    38▮ │  PhoneTopBar: back · variant · tiles-left
├────────────────────────┤
│ ● You           142     │  player rows, active highlighted
│   AI · Steady   130     │
├────────────────────────┤
│  ARISE              +24 │  move-status strip (error > pending > last)
├────────────────────────┤
│                        │
│      15×15  BOARD      │  <Board/> reused; square = width − gutters
│                        │
├────────────────────────┤
│   [ R A C K   × 7 ]    │  <Rack tileSize≈44 wrap=false/> — one row
├────────────────────────┤
│ ↺  ⇅  ⇌  Pass  ⋯  [Submit·N] │  PhoneActionBar; Resign under ⋯
└────────────────────────┘
```

- **Board:** reuse `<Board/>` (already fills its container, square via `aspectRatio:1`, font scales via `cqi`). Width-constrained square. Cells ~24px on 15×15, ~33px on Mini. Tap-to-place is the primary interaction; drag still works.
- **Rack:** extend `Rack` + `DraggableRackTile` with an optional `tileSize` prop (default **64** → iPad rendering byte-identical) and a `wrap` toggle. Phone passes `tileSize ≈ 44, wrap=false` so 7 tiles sit in a single row (`7×44 + gaps ≈ 356px < ~366px available`). Empty-slot placeholder uses the same `tileSize`.
- **Move-status strip:** the derived values (pending word + projected score; last committed move) are extracted into shared hooks `usePendingPreview` / `useLastMove` and consumed by both `GameScreen` (mechanical swap, test-guarded) and `PhoneGame`. The strip's *rendering* is a compact phone-specific component (single line: word + score, error tint on rejection).
- **Actions:** `Submit` is the primary anchor; `Recall / Shuffle / Swap / Pass` are icon buttons; `Resign` lives under a `⋯` overflow to keep the bar to one row. Disabled states identical to desktop (Swap needs bag ≥ `minBagToSwap`, etc.).
- **Modals & overlays:** `BlankLetterPicker`, `SwapPicker`, pass/resign confirms (`ModalFrame`), `ThinkingOverlay` reused unchanged (centred modals are fine on phone). `PhoneGame` is wrapped in its own `DndContext` with the same sensor config.
- **AI driver:** identical effect to `GameScreen` (reused via a shared hook if convenient, else copied — it's small and reads only store state).

### PhoneHome
Vertical stack: wordmark, then full-width `PhoneNavButton`s — **Resume** (only if an in-progress game exists), **New Game**, **Tumbler**, **Spelling Bee**, **Scores**. ≥56px targets.

### PhoneNewGame
Single-column scrolling form: variant (Classic / Random / Mini as stacked selectable cards — defaulting to Mini per the open item), opponent (Hot-seat / AI + difficulty tier), player name(s), `Start`.

### PhoneTumbler
Reuses the store's Tumbler state/actions/timer. Top: 7 letters + text input + countdown + live score. Below: found-words list that scrolls. Timer-start-on-first-keystroke and pause-on-blur behaviour unchanged (store-level).

### PhoneTumblerEnd
The recently-fixed iPad layout collapses naturally to one column on phone: score header → compare bar → "Words you found" → "All possible words", all stacked, inner lists scroll. Pinned to `var(--app-h)`.

### PhoneSpellingBee
The existing hex is a fixed 320×320 component — it fits a 390px phone with small gutters, reused as-is. Input + found-words list + score/rank stacked below it. Daily-seed and progress persistence unchanged (store/IndexedDB).

### PhoneGameEnd
Winner banner, final scores per player, then `Rematch` / `Home`. Single column.

### PhoneScores
The leaderboard is already a list — render it single-column with the same entries/formatting.

### Handoff (hot-seat)
`HotSeatHandoff` is a full-screen overlay; reused as-is. `PhoneApp` renders it for the `handoff` screen exactly as `App` does.

---

## Plumbing

- **PWA manifest** (`vite.config.ts`): `orientation: "landscape-primary"` → **`"any"`** so a phone installs/launches portrait while the iPad still launches landscape. No other manifest change.
- **CSS:** no change to `--app-h` (default `100dvh` is exactly right on the phone path). `#root` already applies safe-area padding. Phone top/action bars add `env(safe-area-inset-*)` where they touch screen edges.
- **base path** (`./`) unaffected — works under GitHub Pages / Vercel as today.

---

## Testing strategy

- **Unit:** `deviceClass.test.ts` — table of `(vw, vh, isTouch)` → expected `{ isPhone, portrait }`, covering iPhone portrait/landscape, iPad mini, iPad Air/Pro, Samsung tablet, touch laptop, narrow non-touch window. Mirrors `airFit.test.ts`.
- **E2E (new, `e2e/phone-*.spec.ts`):** Playwright at iPhone-class viewport (390×844, `hasTouch`). Per screen — renders, primary interaction works, nothing clips (pinned screens: action controls within viewport, lists scroll):
  - `phone-home` — buttons visible, navigation works
  - `phone-game` — tap rack → tap cell places a tile, Submit reflects count, board fits, action bar in view
  - `phone-tumbler` — type a formable word, submit, score updates
  - `phone-spelling-bee` — tap letters + center, submit a valid word
  - `phone-endscreens` — Tumbler end + Game end fit with no clipped buttons (same shape as `tumbler-endscreen-fit.spec.ts`)
- **Regression guard:** existing iPad/Pro/Air e2e specs stay green unchanged. Add one assertion that at the iPad Pro viewport `DeviceRouter` renders the desktop tree (e.g. `data-fit-shell`/known desktop marker present, phone tree absent) and at the iPhone portrait viewport it renders the phone tree.
- **Gates (per project workflow):** `typecheck` zero errors, all unit + e2e green, `lint:engine-purity` intact (no engine changes anyway).

---

## Out of scope (→ `docs/BACKLOG.md`)

- Pinch-zoom on the 15×15 phone board (tap-to-place suffices for v1).
- A bespoke phone-*landscape* layout — landscape intentionally reuses the existing scaled view ("support both").
- Phone-specific onboarding / first-run hints.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| 15×15 at ~24px feels cramped | Recommend Mini as phone default; board is responsive; zoom is a backlog item |
| Refactors touch `App.tsx` / `GameScreen.tsx` | Changes are mechanical (effect/hook extraction) and fully covered by existing + new tests; rendered output identical |
| Rotation mid-game | Store is global → state survives the path swap; only an in-flight drag cancels |
| Touch laptop in a tiny window hits phone path | Rare; same `isTouch` definition as today; acceptable |
| Manifest `any` affects iPad install | `"any"` still permits landscape; verify iPad install/launch in review |

## Phasing (Phase 5 — Phone)

Detailed, bite-sized tasks go in the implementation plan. High-level order:

1. **Foundation** — `deviceClass.ts` + tests, `useDeviceClass`, `useBootstrap` extraction, `DeviceRouter`, `PhoneApp` skeleton routing to placeholder screens, manifest → `"any"`. Verify big-screen specs green + phone routes.
2. **Shell + menus** — `PhoneShell`, `PhoneTopBar`, `PhoneHome`, `PhoneScores`, navigation; Loading reuse.
3. **PhoneNewGame.**
4. **PhoneGame** — board + `Rack` `tileSize` prop + `PhoneActionBar` + modals + DnD + AI driver (the big one).
5. **PhoneGameEnd** + handoff wiring.
6. **PhoneTumbler** + **PhoneTumblerEnd.**
7. **PhoneSpellingBee.**
8. **Polish pass** — ui-ux-pro-max per screen, live iPhone-viewport screenshots for owner sign-off, final full regression.

## Success criteria

- Every big-screen viewport renders byte-identical to today (existing specs green).
- On an iPhone-class portrait viewport, every screen is usable: no clipped controls, ≥44px targets, board playable end-to-end, both solo games playable.
- `typecheck` clean; all unit + e2e green; engine purity intact.
- Installable as a portrait PWA on a phone; still installable landscape on iPad.
