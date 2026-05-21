# Spec — Scale to fit iPad Air 2022

**Date:** 2026-05-22
**Status:** Awaiting review
**Owner:** Jegan · **Engineer:** Claude Code

## Problem

The app's screens are tuned to fit the iPad Pro 5th gen (1366×1024 PWA / 1366×880 Safari, landscape). On the smaller **iPad Air 5th gen (2022)** — 1180×820 PWA / ~1180×704 Safari, landscape — the same layouts get cramped at the shorter height, and a couple of content-driven screens overflow slightly (Home runs ~21px past the bottom at 704).

Measured baseline (live, via the running dev app):

| Viewport | Device/mode | Page fit today |
|---|---|---|
| 1366×880 | Pro, Safari | Fits exactly (scrollHeight 880) ✅ |
| 1366×1024 | Pro, PWA | Fits (extra room) ✅ |
| 1180×820 | Air, PWA | Adapts but tighter; internal regions shrink |
| 1180×704 | Air, Safari | Tighter; Home overflows ~21px |

## Goal

Make the iPad Air show the **identical, good-looking Pro layout, uniformly scaled down to fit** — nothing redesigned, nothing rearranged.

## Non-goals / out of scope

- **No change to Pro (1366) or laptop layouts.** This is the hard constraint. They must use the exact same render path as today.
- No redesign of any individual screen.
- No engine / game-logic / storage changes.
- Portrait orientation (the app stays landscape-only; the existing portrait warning is unaffected).
- Other device sizes beyond the three named (laptop, iPad Pro 5th gen, iPad Air 2022).

## Approach — fit-to-viewport "canvas"

Wrap the whole app in a single `FitToViewport` component:

- **When inactive (Pro / laptop):** renders children directly — no wrapper, no transform. Byte-for-byte the current behavior.
- **When active (Air):** renders the UI inside a **fixed 1366×880 "design canvas"** (the exact Pro-Safari layout) and scales that canvas down to fit the actual viewport. The Air therefore shows the identical layout, just smaller.

Because the UI always renders at the known-good 880 height before scaling, the small Home overflow at 704 disappears for free.

### Activation gate

Active when **all** of:

- Touch device — `matchMedia('(any-pointer: coarse)').matches` (true on every iPad, including with a trackpad attached; false on a mouse/trackpad-only laptop).
- Landscape — `innerWidth > innerHeight`.
- `innerWidth ≤ 1280` — the Air is 1180 wide; the Pro is 1366. 1280 sits cleanly between them, and also excludes a touchscreen laptop (always ≥1280).

This triple-gate guarantees the Pro and any laptop never activate. The Pro is excluded by **width** and the laptop by **touch** — two independent reasons, so a single check misbehaving still can't catch them.

| Device / mode | Width | Touch | Landscape | ≤1280 | Scales? |
|---|---|---|---|---|---|
| iPad Pro 5th gen — PWA 1366×1024 | 1366 | ✓ | ✓ | ✗ | **No (1×)** |
| iPad Pro 5th gen — Safari 1366×880 | 1366 | ✓ | ✓ | ✗ | **No (1×)** |
| Laptop — mouse/trackpad | any | ✗ | — | — | **No (1×)** |
| Laptop — touchscreen | ≥1280 | ✓ | ✓ | ✗ | **No (1×)** |
| iPad Air 2022 — PWA 1180×820 | 1180 | ✓ | ✓ | ✓ | Yes — 0.864× |
| iPad Air 2022 — Safari 1180×704 | 1180 | ✓ | ✓ | ✓ | Yes — 0.80× |

When inactive, `FitToViewport` returns its children unchanged — no wrapper element, no `zoom`, no `--app-h` override — so the Pro/laptop render path is byte-for-byte identical to today, not merely "scaled by 1×".

**Only edge case:** an iPad Pro run in split-screen multitasking (window narrowed to ≤1280) would scale. In fullscreen / installed-PWA mode — how this app is used — the Pro never scales.

### Scale math (pure, unit-tested)

```
DESIGN_W = 1366, DESIGN_H = 880, MAX_W = 1280
active = isTouch && (vw > vh) && vw <= MAX_W
scale  = active ? min(vw / DESIGN_W, vh / DESIGN_H, 1) : 1
```

Expected: Pro 1366×880 → inactive (1×). Pro 1366×1024 → inactive (1×). Air PWA 1180×820 → 0.864×. Air Safari 1180×704 → 0.800×. Laptop (fine pointer) → inactive (1×) at any size.

### Scaling primitive

Use CSS **`zoom`** on the canvas, not `transform: scale`. On WebKit (the iPad target) `zoom` scales layout **and input coordinates** consistently, so pointer/drag math stays correct and the canvas footprint shrinks to fit naturally (centered by a cream-filled flex parent). `transform: scale` is the fallback only if a drag issue surfaces. The thin margin left on the non-binding axis is filled with `tokens.color.cream` so it reads as intentional.

### Height handling

Screens pin to `100dvh`. Route that through one CSS variable:

- `:root { --app-h: 100dvh; }` (default → Pro/laptop unchanged).
- The active canvas sets `--app-h: 880px` so screens fill the canvas instead of the real (shorter) viewport.
- Swap `100dvh` → `var(--app-h)` in the screens that use it.

Content-driven screens (Home, Scores, GameEnd, etc.) need no change: they render inside the 880-tall canvas and fit exactly as they do on Pro Safari.

## Files touched

- **New** `src/ui/fitToViewport.ts` — pure `computeAirFit({ vw, vh, isTouch })` → `{ active, scale }`.
- **New** `src/ui/FitToViewport.tsx` — wrapper component: tracks viewport on `resize`, applies the cream centering shell + zoomed canvas + `--app-h` when active, passes children through untouched when inactive.
- **New** `src/ui/__tests__/fitToViewport.test.ts` — unit tests for the cases above.
- **Edit** `src/App.tsx` — wrap the screen output in `<FitToViewport>`.
- **Edit** `src/index.css` — add `:root { --app-h: 100dvh; }`.
- **Edit** `100dvh` → `var(--app-h)`: `TumblerScreen.tsx`, `SpellingBeeScreen.tsx`, `GameScreen.tsx`, `NewGameScreen.tsx`, `SettingsModal.tsx` (~8 occurrences, including the `calc(100dvh - …)` / `min(…, calc(100dvh - …))` ones).

## Risk

**Drag-and-drop under scaling.** Board tile drag (`@dnd-kit`) and the Spelling Bee slide-to-spell rely on pointer coordinates. The `zoom` primitive keeps these correct on WebKit; the plan must explicitly verify both on the Air viewport. Tap-to-place is an existing fallback regardless.

## Verification

- **Unit:** `computeAirFit` cases above (`bun run test`).
- **Types:** `bun run typecheck` zero errors.
- **Live (dev app, DOM measurements — screenshots are timing out in the preview tool):**
  - At 1180×820 and 1180×704: canvas zoom applied; no control clipped; controls reachable; board drag + Bee slide track the pointer.
  - At 1366×880 and 1366×1024: wrapper inactive (no zoom/transform); behavior identical to current.
- **Regression:** confirm Pro stays pixel-identical (no wrapper styles present).

## Open question

Is the laptop wider than ~1280px? If it can ever be ≤1280, the touch gate already protects it; noting it for confirmation.
