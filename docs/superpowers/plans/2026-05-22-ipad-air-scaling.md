# iPad Air 2022 Scale-to-Fit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the existing layout, uniformly scaled down, on the iPad Air 2022 only — leaving iPad Pro and laptop byte-for-byte unchanged.

**Architecture:** A single `FitToViewport` wrapper around the whole app. On the Pro/laptop it returns children untouched. On a small touch landscape screen (≤1280px wide → the Air) it renders the UI inside a fixed 1366×880 "design canvas" and shrinks that canvas with CSS `zoom`. A `--app-h` CSS variable makes the viewport-pinned screens fill the 880 canvas instead of the real (shorter) Air viewport.

**Tech Stack:** Vite + React 18 + TypeScript (strict), Vitest (node env), CSS `zoom`.

**Spec:** `docs/superpowers/specs/2026-05-22-ipad-air-scaling-design.md`

**Convention:** Every commit message ends with the trailer:
`Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

**Do NOT** commit/push the final result without the owner's go-ahead beyond what each task says; tasks commit locally. (The repo auto-pushes `main`; pushing happens in the final task after on-device confirmation.)

---

## File Structure

- **Create** `src/ui/fitToViewport.ts` — pure `computeAirFit(viewport)` + the design constants. No DOM. Unit-tested.
- **Create** `src/ui/__tests__/fitToViewport.test.ts` — unit tests for the gate + scale math.
- **Create** `src/ui/FitToViewport.tsx` — the wrapper component (viewport tracking + cream shell + zoomed canvas). Thin; delegates all logic to `fitToViewport.ts`.
- **Modify** `src/index.css` — add `:root { --app-h: 100dvh; }`.
- **Modify** `src/main.tsx` — wrap `<App />` in `<FitToViewport>`.
- **Modify** screens that pin to the viewport — swap `100dvh` → `var(--app-h)`:
  - `src/ui/screens/TumblerScreen.tsx` (2)
  - `src/ui/screens/SpellingBeeScreen.tsx` (2)
  - `src/ui/screens/GameScreen.tsx` (2)
  - `src/ui/screens/NewGameScreen.tsx` (1)
  - `src/ui/components/SettingsModal.tsx` (3)

Content-driven screens (Home, Scores, GameEnd, TumblerEnd, Loading) use `Surface`'s `minHeight: 100%`, which resolves against the 880 canvas automatically — **no change needed**.

---

## Task 1: Pure scale function + tests

**Files:**
- Create: `src/ui/fitToViewport.ts`
- Test: `src/ui/__tests__/fitToViewport.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/ui/__tests__/fitToViewport.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeAirFit, DESIGN_W, DESIGN_H, ACTIVATION_MAX_WIDTH } from "../fitToViewport.js";

describe("computeAirFit", () => {
  it("stays inactive on the iPad Pro (PWA 1366x1024)", () => {
    expect(computeAirFit({ vw: 1366, vh: 1024, isTouch: true })).toEqual({ active: false, scale: 1 });
  });

  it("stays inactive on the iPad Pro (Safari 1366x880)", () => {
    expect(computeAirFit({ vw: 1366, vh: 880, isTouch: true })).toEqual({ active: false, scale: 1 });
  });

  it("stays inactive on a mouse/trackpad laptop", () => {
    expect(computeAirFit({ vw: 1440, vh: 900, isTouch: false })).toEqual({ active: false, scale: 1 });
  });

  it("stays inactive on a touchscreen laptop (wider than the gate)", () => {
    expect(computeAirFit({ vw: 1536, vh: 864, isTouch: true })).toEqual({ active: false, scale: 1 });
  });

  it("activates and is height-bound on the Air in Safari (1180x704)", () => {
    const r = computeAirFit({ vw: 1180, vh: 704, isTouch: true });
    expect(r.active).toBe(true);
    expect(r.scale).toBeCloseTo(0.8, 5); // min(1180/1366, 704/880) = 704/880 = 0.8
  });

  it("activates and is width-bound on the Air in PWA (1180x820)", () => {
    const r = computeAirFit({ vw: 1180, vh: 820, isTouch: true });
    expect(r.active).toBe(true);
    expect(r.scale).toBeCloseTo(1180 / 1366, 5); // 0.8638 < 820/880
  });

  it("stays inactive in portrait (no scaling when held tall)", () => {
    expect(computeAirFit({ vw: 820, vh: 1180, isTouch: true })).toEqual({ active: false, scale: 1 });
  });

  it("stays inactive on a small non-touch window", () => {
    expect(computeAirFit({ vw: 1000, vh: 700, isTouch: false })).toEqual({ active: false, scale: 1 });
  });

  it("exports the expected design constants", () => {
    expect([DESIGN_W, DESIGN_H, ACTIVATION_MAX_WIDTH]).toEqual([1366, 880, 1280]);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `bun run test -- fitToViewport`
Expected: FAIL — `Cannot find module '../fitToViewport.js'`.

- [ ] **Step 3: Implement the pure module**

Create `src/ui/fitToViewport.ts`:

```ts
/**
 * Fit-to-viewport math for the iPad Air. Pure — no DOM, unit-tested.
 *
 * The app is designed to look good at 1366x880 (iPad Pro, Safari). On a
 * smaller touch screen in landscape (the iPad Air, 1180 wide) we render
 * that same 1366x880 canvas and scale it down to fit. The Pro (1366) and
 * any laptop never activate — see computeAirFit's gate.
 */
export const DESIGN_W = 1366;
export const DESIGN_H = 880;
/** The Air is 1180 wide; the Pro is 1366. 1280 sits cleanly between. */
export const ACTIVATION_MAX_WIDTH = 1280;

export interface ViewportInfo {
  readonly vw: number;
  readonly vh: number;
  /** True on touch screens (any-pointer: coarse). False on mouse/trackpad laptops. */
  readonly isTouch: boolean;
}

export interface FitResult {
  readonly active: boolean;
  readonly scale: number;
}

export function computeAirFit({ vw, vh, isTouch }: ViewportInfo): FitResult {
  const landscape = vw > vh;
  const active = isTouch && landscape && vw <= ACTIVATION_MAX_WIDTH;
  if (!active) return { active: false, scale: 1 };
  const scale = Math.min(vw / DESIGN_W, vh / DESIGN_H, 1);
  return { active: true, scale };
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `bun run test -- fitToViewport`
Expected: PASS (9 tests).

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/ui/fitToViewport.ts src/ui/__tests__/fitToViewport.test.ts
git commit -m "feat(layout): pure computeAirFit scale fn for iPad Air fit"
```

---

## Task 2: FitToViewport wrapper component

**Files:**
- Create: `src/ui/FitToViewport.tsx`

- [ ] **Step 1: Implement the component**

Create `src/ui/FitToViewport.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { tokens } from "./tokens.js";
import { computeAirFit, DESIGN_W, DESIGN_H, type ViewportInfo } from "./fitToViewport.js";

// `zoom` and the `--app-h` custom property aren't in React's CSSProperties;
// extend the type rather than reaching for `any` (engine/repo bans `any`).
type CanvasStyle = CSSProperties & { zoom?: number; "--app-h"?: string };

function readViewport(): ViewportInfo {
  const isTouch =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(any-pointer: coarse)").matches;
  return { vw: window.innerWidth, vh: window.innerHeight, isTouch };
}

/**
 * Wraps the whole app. On the iPad Pro and laptop this returns its children
 * untouched (no wrapper element, no transform) — identical to not existing.
 * On a small touch landscape screen (the iPad Air) it renders the children
 * inside a fixed 1366x880 canvas scaled down with CSS `zoom`, so the Air
 * shows the exact Pro layout, just smaller. `zoom` (not `transform`) is used
 * because WebKit keeps pointer/drag coordinates correct under `zoom`.
 */
export function FitToViewport({ children }: { readonly children: ReactNode }): JSX.Element {
  const [viewport, setViewport] = useState<ViewportInfo>(() => readViewport());

  useEffect(() => {
    const onChange = (): void => setViewport(readViewport());
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, []);

  const { active, scale } = computeAirFit(viewport);
  if (!active) return <>{children}</>;

  const shellStyle: CSSProperties = {
    width: "100%",
    height: "100dvh",
    background: tokens.color.cream,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };
  const canvasStyle: CanvasStyle = {
    width: DESIGN_W,
    height: DESIGN_H,
    flex: "none",
    zoom: scale,
    "--app-h": `${DESIGN_H}px`,
  };

  return (
    <div data-fit-shell style={shellStyle}>
      <div data-fit-canvas style={canvasStyle}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: zero errors. (If `zoom` is rejected by the installed csstype, the `CanvasStyle` intersection already covers it — confirm no error mentions `zoom`.)

- [ ] **Step 3: Run the full test suite (nothing should break)**

Run: `bun run test`
Expected: all tests PASS (the new file isn't imported yet; suite unchanged + Task 1's 9 tests).

- [ ] **Step 4: Commit**

```bash
git add src/ui/FitToViewport.tsx
git commit -m "feat(layout): FitToViewport wrapper (cream shell + zoomed 1366x880 canvas)"
```

---

## Task 3: `--app-h` variable + screen swaps

This puts the variable system in place. Default `--app-h: 100dvh` means **every screen renders exactly as today** until the wrapper activates.

**Files:**
- Modify: `src/index.css`
- Modify: `src/ui/screens/TumblerScreen.tsx`
- Modify: `src/ui/screens/SpellingBeeScreen.tsx`
- Modify: `src/ui/screens/GameScreen.tsx`
- Modify: `src/ui/screens/NewGameScreen.tsx`
- Modify: `src/ui/components/SettingsModal.tsx`

- [ ] **Step 1: Add the variable to `src/index.css`**

Find:

```css
html,
body,
#root {
  height: 100%;
  margin: 0;
}
```

Replace with:

```css
html,
body,
#root {
  height: 100%;
  margin: 0;
}

/* Default app height = real viewport. FitToViewport overrides this to the
   fixed canvas height (880px) on the iPad Air so pinned screens fill the
   canvas instead of the shorter real viewport. */
:root {
  --app-h: 100dvh;
}
```

- [ ] **Step 2: Swap the pinned screens**

`src/ui/screens/TumblerScreen.tsx` — find:

```tsx
          height: "100dvh",
          maxHeight: "100dvh",
```

Replace with:

```tsx
          height: "var(--app-h)",
          maxHeight: "var(--app-h)",
```

`src/ui/screens/SpellingBeeScreen.tsx` — find (identical block) and replace identically:

```tsx
          height: "100dvh",
          maxHeight: "100dvh",
```
→
```tsx
          height: "var(--app-h)",
          maxHeight: "var(--app-h)",
```

`src/ui/screens/GameScreen.tsx` — find:

```tsx
          height: "100dvh",
          maxHeight: "100dvh",
```

Replace with:

```tsx
          height: "var(--app-h)",
          maxHeight: "var(--app-h)",
```

`src/ui/screens/NewGameScreen.tsx` — find:

```tsx
          minHeight: "100dvh",
```

Replace with:

```tsx
          minHeight: "var(--app-h)",
```

`src/ui/components/SettingsModal.tsx` — three separate edits:

1. Find `maxHeight: "calc(100dvh - 24px)",` → replace with `maxHeight: "calc(var(--app-h) - 24px)",`
2. Find (in the modal body) `minHeight: "min(580px, calc(100dvh - 240px))",` → replace with `minHeight: "min(580px, calc(var(--app-h) - 240px))",`
3. Find (in `SoundsPanel`) `maxHeight: "min(580px, calc(100dvh - 240px))",` → replace with `maxHeight: "min(580px, calc(var(--app-h) - 240px))",`

- [ ] **Step 3: Confirm no stray `100dvh` literals remain**

Run: `bun run test -- fitToViewport` first to confirm green, then search the source.
Search: ripgrep `100dvh` under `src/`.
Expected: **zero matches** in `src/` (all replaced). If any remain, swap them too.

- [ ] **Step 4: Typecheck + full tests**

Run: `bun run typecheck`
Run: `bun run test`
Expected: zero type errors; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/ui/screens/TumblerScreen.tsx src/ui/screens/SpellingBeeScreen.tsx src/ui/screens/GameScreen.tsx src/ui/screens/NewGameScreen.tsx src/ui/components/SettingsModal.tsx
git commit -m "refactor(layout): route pinned-screen height through --app-h var"
```

---

## Task 4: Wire FitToViewport into the app

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Wrap `<App />`**

Find:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Replace with:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { FitToViewport } from "./ui/FitToViewport.js";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <React.StrictMode>
    <FitToViewport>
      <App />
    </FitToViewport>
  </React.StrictMode>,
);
```

- [ ] **Step 2: Typecheck + tests + build**

Run: `bun run typecheck`
Run: `bun run test`
Run: `bun run build`
Expected: zero type errors; all tests pass; build succeeds (confirms no runtime import issues and the worker chunk still emits).

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat(layout): activate FitToViewport around the app"
```

---

## Task 5: Verification + on-device handoff

No code changes except a temporary force-on toggle that is reverted at the end. Screenshots in the preview tool have been timing out, so verification leans on DOM measurements (`preview_eval`) and the real device.

- [ ] **Step 1: Start the dev server**

Use the preview MCP: `preview_start` with name `dev` (config already in `.claude/launch.json`). Note the `serverId`.

- [ ] **Step 2: Confirm the Pro/laptop path is untouched (gate OFF)**

`preview_resize` to 1366×880, then 1366×1024. At each, `preview_eval`:

```js
({ shell: !!document.querySelector('[data-fit-shell]'),
   rootChildIsApp: document.querySelector('#root')?.firstElementChild?.getAttribute('data-fit-shell') })
```

Expected: `shell: false` (no wrapper element) at both sizes — proves the Pro renders through the unchanged path. (The preview browser reports non-touch, so the gate is off here regardless; this confirms the inactive branch renders children directly.)

- [ ] **Step 3: Force-on to inspect the scaled canvas**

Temporarily edit `src/ui/FitToViewport.tsx` `readViewport()` — change `isTouch` to a literal `true`:

```ts
  return { vw: window.innerWidth, vh: window.innerHeight, isTouch: true };
```

`preview_resize` to 1180×704 (Air Safari). `preview_eval`:

```js
(() => {
  const c = document.querySelector('[data-fit-canvas]');
  const cs = c && getComputedStyle(c);
  return { hasCanvas: !!c, zoom: cs && cs.zoom, w: cs && cs.width, h: cs && cs.height,
           appH: c && getComputedStyle(document.documentElement).getPropertyValue('--app-h') };
})()
```

Expected: `hasCanvas: true`, `zoom ≈ 0.8`, `w: "1366px"`, `h: "880px"`.

Then check nothing clips — `preview_eval`:

```js
(() => { const c = document.querySelector('[data-fit-canvas]');
  return { canvasScroll: c.scrollHeight, designH: 880, fits: c.scrollHeight <= 882 }; })()
```

Expected: `fits: true` on Home. Repeat at 1180×820 (expect `zoom ≈ 0.864`).

- [ ] **Step 4: Spot-check the dense screens (still force-on)**

Navigate with `preview_click` and re-run the clip check from Step 3 on:
- New Game (`preview_click` the "New game" / play entry on Home),
- Tumbler and Spelling Bee (Home menu),
- an in-progress game board (start a hot-seat game),
- the Settings modal (open it; confirm the panel is centered and the "Done" footer is visible — `preview_eval` the dialog's `getBoundingClientRect().bottom` is ≤ viewport height).

Expected: each screen's content fits within the 880 canvas; controls present and not clipped. Note any screen that fails for follow-up (likely candidates: Settings modal under `zoom`, or New Game with the on-screen keyboard — neither testable fully in the preview).

- [ ] **Step 5: Revert the force-on toggle**

```bash
git checkout -- src/ui/FitToViewport.tsx
```

Confirm `readViewport` is back to `isTouch` from `matchMedia`.

- [ ] **Step 6: Final gates + push for on-device test**

Run: `bun run typecheck` · `bun run test` · `bun run build` — all green.

```bash
git status --short   # confirm only intended files changed; .superpowers/ stays untracked & unstaged
git push
```

- [ ] **Step 7: Owner on-device confirmation**

Vercel redeploys on push. Ask the owner to open the deployed app on the **real iPad Air 2022** (both Safari and the installed-to-home-screen PWA) and confirm:
- Everything fits with no cut-off controls.
- **Board tile drag-and-drop** and **Spelling Bee slide-to-spell** land on the right cell/letter (the one interaction `zoom` could affect; tap-to-place is the fallback).
- Settings modal opens centered with the Done button reachable.

And confirm on the **iPad Pro** that nothing changed.

If drag is off on the real Air: fallback is to switch the canvas primitive from `zoom` to `transform: scale(scale)` plus a width/height compensation, or to special-case the drag overlay — re-open the plan at Task 2 if so.

---

## Self-review notes

- **Spec coverage:** activation gate (Task 1) ✓, scale math (Task 1) ✓, zoom canvas + `--app-h` (Tasks 2–3) ✓, Pro/laptop untouched (Task 4 wrap returns children when inactive; Step 2 verifies) ✓, drag risk (Task 5 Step 7) ✓, verification via DOM measurements (Task 5) ✓.
- **Type consistency:** `ViewportInfo`/`FitResult`/`computeAirFit`/`DESIGN_W`/`DESIGN_H`/`ACTIVATION_MAX_WIDTH` are defined in Task 1 and used unchanged in Tasks 1–2.
- **No placeholders:** every code block is complete and copy-pasteable.
