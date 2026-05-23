# Phone Portrait Port — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native portrait phone experience (every screen, board game included) via an additive `DeviceRouter` path, leaving laptop / Samsung tablet / iPad Pro / iPad Air rendering byte-identical.

**Architecture:** A new top-level `DeviceRouter` runs the shared bootstrap, then routes `phone (touch + short-side ≤ 540px) AND portrait → PhoneApp`; every other case (incl. phone-in-landscape) takes today's exact `FitToViewport → App` path. Phone screens are new layout shells that reuse the existing store, engine, AI, storage, and the responsive `Board`/`Rack`/`Tile`/modal leaf components. Only logic (derived-value hooks) is shared upward; layout is phone-specific.

**Tech Stack:** Vite + React 18 + TypeScript (strict, `exactOptionalPropertyTypes`) + Tailwind v4 + Zustand + @dnd-kit + idb + Vitest + Playwright. Package manager bun, but **e2e/scripts run via `npm run`** (bun not on the Bash PATH).

**Reference spec:** `docs/superpowers/specs/2026-05-24-phone-portrait-port-design.md`

**Project rules that shape this plan:**
- Big-screen output must stay identical — proven by the *existing* e2e suite staying green at its 1180×820 (no-touch) viewport.
- All UI work uses the **ui-ux-pro-max** skill; screen visuals are iterated live with iPhone-viewport screenshots for owner sign-off. Each screen task therefore ships a real compiling skeleton + a Playwright contract test, then a polish step.
- Conventional commits, one logical chunk per commit. Auto-commit + push to `main` after each green task (Vercel auto-deploys).
- Gate to "done": `npm run typecheck` clean, `npm run test` green, `npm run lint:engine-purity` clean, `npx playwright test` green.

---

## File Structure

**New files**
- `src/ui/deviceClass.ts` — pure `classifyDevice()` + `PHONE_MAX_SHORT_SIDE`
- `src/engine/__tests__/` is engine-only; device test goes at `src/ui/__tests__/deviceClass.test.ts` (Vitest picks up `**/*.test.ts`)
- `src/ui/useDeviceClass.ts` — viewport hook (resize/orientationchange)
- `src/ui/useBootstrap.ts` — boot effects hoisted from `App.tsx`
- `src/ui/DeviceRouter.tsx` — the routing fork
- `src/ui/hooks/usePendingPreview.ts`, `src/ui/hooks/useLastMove.ts` — derived values shared by `GameScreen` + `PhoneGame`
- `src/ui/phone/PhoneApp.tsx` — phone screen switch
- `src/ui/phone/PhonePlaceholder.tsx` — temporary stub (removed by end of plan)
- `src/ui/phone/PhoneShell.tsx`, `src/ui/phone/components/PhoneTopBar.tsx`, `PhoneActionBar.tsx`, `PhoneNavButton.tsx`
- `src/ui/phone/screens/PhoneHome.tsx`, `PhoneNewGame.tsx`, `PhoneGame.tsx`, `PhoneGameEnd.tsx`, `PhoneTumbler.tsx`, `PhoneTumblerEnd.tsx`, `PhoneSpellingBee.tsx`, `PhoneScores.tsx`
- `e2e/phone-helpers.ts` — shared IDB-seed/reload helper for phone specs
- `e2e/phone-routing.spec.ts`, `phone-home.spec.ts`, `phone-newgame.spec.ts`, `phone-game.spec.ts`, `phone-endscreens.spec.ts`, `phone-tumbler.spec.ts`, `phone-bee.spec.ts`

**Modified files**
- `src/main.tsx` — render `<DeviceRouter/>`
- `src/App.tsx` — drop the two boot effects (now in `useBootstrap`); keep the screen switch
- `src/ui/components/Rack.tsx` — add `tileSize` + `wrap` props (defaults preserve iPad)
- `src/ui/components/DraggableRackTile.tsx` — add `size` prop (default 64)
- `src/ui/screens/GameScreen.tsx` — consume the two extracted hooks (output identical)
- `vite.config.ts` — manifest `orientation: "any"`
- `docs/GOTCHAS.md`, `docs/BACKLOG.md`, `C:\dev\projects\scrabble-babble\CLAUDE.md` (phase table) — closing docs

---

## PHASE A — Foundation (routing skeleton, big screens provably untouched)

### Task 1: `deviceClass.ts` (pure) + tests

**Files:**
- Create: `src/ui/deviceClass.ts`
- Test: `src/ui/__tests__/deviceClass.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/ui/__tests__/deviceClass.test.ts
import { describe, it, expect } from "vitest";
import { classifyDevice, PHONE_MAX_SHORT_SIDE } from "../deviceClass.js";

describe("classifyDevice", () => {
  it("iPhone portrait (390x844, touch) → phone + portrait", () => {
    expect(classifyDevice({ vw: 390, vh: 844, isTouch: true })).toEqual({ isPhone: true, portrait: true });
  });
  it("iPhone landscape (844x390, touch) → phone + NOT portrait", () => {
    expect(classifyDevice({ vw: 844, vh: 390, isTouch: true })).toEqual({ isPhone: true, portrait: false });
  });
  it("iPad mini portrait (744x1133, touch) → NOT phone", () => {
    expect(classifyDevice({ vw: 744, vh: 1133, isTouch: true }).isPhone).toBe(false);
  });
  it("iPad Air landscape (1180x820, touch) → NOT phone", () => {
    expect(classifyDevice({ vw: 1180, vh: 820, isTouch: true }).isPhone).toBe(false);
  });
  it("non-touch narrow window (480x900) → NOT phone (laptops never phone-route)", () => {
    expect(classifyDevice({ vw: 480, vh: 900, isTouch: false }).isPhone).toBe(false);
  });
  it("boundary: short side == PHONE_MAX_SHORT_SIDE is a phone", () => {
    expect(classifyDevice({ vw: PHONE_MAX_SHORT_SIDE, vh: 900, isTouch: true }).isPhone).toBe(true);
  });
  it("square viewport counts as portrait", () => {
    expect(classifyDevice({ vw: 500, vh: 500, isTouch: true }).portrait).toBe(true);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails** — `npm run test -- deviceClass` → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/ui/deviceClass.ts
/**
 * Phone detection, mirroring airFit.ts's pure/tested style. A phone is a
 * touch device whose SHORTER side is small enough that the 1366-wide canvas
 * can't be scaled down to anything usable — it needs a native portrait layout.
 *
 * 540 cleanly separates phones (short side ≤ ~430) from tablets (iPad mini is
 * 744). `isTouch` reuses the (any-pointer: coarse) signal, so a mouse/trackpad
 * laptop never takes the phone path, even in a narrow window.
 */
export const PHONE_MAX_SHORT_SIDE = 540;

export interface DeviceViewport {
  readonly vw: number;
  readonly vh: number;
  readonly isTouch: boolean;
}

export interface DeviceClass {
  readonly isPhone: boolean;
  readonly portrait: boolean;
}

export function classifyDevice({ vw, vh, isTouch }: DeviceViewport): DeviceClass {
  const shortSide = Math.min(vw, vh);
  const isPhone = isTouch && shortSide <= PHONE_MAX_SHORT_SIDE;
  const portrait = vh >= vw;
  return { isPhone, portrait };
}
```

- [ ] **Step 4: Run it, confirm green** — `npm run test -- deviceClass` → PASS.
- [ ] **Step 5: Commit** — `feat(phone): pure device classifier (phone vs tablet/desktop)`

### Task 2: `useDeviceClass` hook

**Files:** Create `src/ui/useDeviceClass.ts`

- [ ] **Step 1: Implement** (DOM hook — covered by e2e routing in Task 7, not unit-tested)

```ts
// src/ui/useDeviceClass.ts
import { useEffect, useState } from "react";
import { classifyDevice, type DeviceClass, type DeviceViewport } from "./deviceClass.js";

function read(): DeviceViewport {
  const isTouch =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(any-pointer: coarse)").matches;
  return { vw: window.innerWidth, vh: window.innerHeight, isTouch };
}

export function useDeviceClass(): DeviceClass {
  const [vp, setVp] = useState<DeviceViewport>(() => read());
  useEffect(() => {
    const onChange = (): void => setVp(read());
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, []);
  return classifyDevice(vp);
}
```

- [ ] **Step 2: Typecheck** — `npm run typecheck` → 0 errors.
- [ ] **Step 3: Commit** — `feat(phone): useDeviceClass viewport hook`

### Task 3: Extract `useBootstrap` from `App.tsx`

**Files:** Create `src/ui/useBootstrap.ts`; Modify `src/App.tsx`

- [ ] **Step 1: Create `useBootstrap.ts`** — move both `App.tsx` effects verbatim (audio fast-path + main `Promise.all` load → `setScreen({kind:"home"})`).

```ts
// src/ui/useBootstrap.ts
import { useEffect } from "react";
import { useGameStore } from "../store/gameStore.js";
import { loadDictionary } from "../data/load-dictionary.js";
import { loadInProgress } from "../storage/game-storage.js";
import {
  getAudioSettings, getCurrentUser, getOpponent, getPlayerNames, getVariant,
} from "../storage/settings-storage.js";
import { setAudioConfig } from "../audio/sounds.js";

/** Boot effects hoisted from App so they run once at the router level,
 *  regardless of which device path renders. Behaviour is unchanged. */
export function useBootstrap(): void {
  const setDictionary = useGameStore((s) => s.setDictionary);
  const setScreen = useGameStore((s) => s.setScreen);
  const setSettings = useGameStore((s) => s.setSettings);
  const setOpponent = useGameStore((s) => s.setOpponent);
  const setVariant = useGameStore((s) => s.setVariant);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);

  useEffect(() => {
    void (async () => {
      const audio = await getAudioSettings().catch(() => null);
      if (audio) setAudioConfig(audio);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const [trie, inProgress, names, opponent, variant, user] = await Promise.all([
        loadDictionary().catch((e: unknown) => { console.error("Dictionary load failed", e); return null; }),
        loadInProgress().catch((e: unknown) => { console.error("Load in-progress failed", e); return null; }),
        getPlayerNames().catch((e: unknown) => { console.error("Load player names failed", e); return ["Player 1", "Player 2"] as [string, string]; }),
        getOpponent().catch((e: unknown) => { console.error("Load opponent failed", e); return { kind: "human" } as const; }),
        getVariant().catch((e: unknown) => { console.error("Load variant failed", e); return "classic" as const; }),
        getCurrentUser().catch((e: unknown) => { console.error("Load current user failed", e); return null; }),
      ]);
      if (trie) setDictionary(trie);
      setSettings(names);
      setOpponent(opponent);
      setVariant(variant);
      if (user) setCurrentUser(user);
      void inProgress;
      await new Promise((resolve) => setTimeout(resolve, 200));
      setScreen({ kind: "home" });
    })();
  }, [setDictionary, setScreen, setSettings, setOpponent, setVariant, setCurrentUser]);
}
```

- [ ] **Step 2: Slim `App.tsx`** — remove the two `useEffect`s and their now-unused imports; keep the `switch`. App keeps `screen`, `setScreen`, `game` selectors (needed for the handoff case). Final body:

```tsx
export function App(): JSX.Element {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const game = useGameStore((s) => s.game);
  switch (screen.kind) {
    case "loading": return <LoadingScreen />;
    case "home": return <HomeScreen />;
    case "new_game": return <NewGameScreen />;
    case "game": return <GameScreen />;
    case "handoff": {
      const nextName = game?.players[screen.nextPlayerIndex]?.name ?? "Next player";
      return <HotSeatHandoff nextPlayerName={nextName} onReady={() => setScreen({ kind: "game" })} />;
    }
    case "game_end": return <GameEndScreen />;
    case "tumbler": return <TumblerScreen />;
    case "tumbler_end": return <TumblerEndScreen />;
    case "spelling_bee": return <SpellingBeeScreen />;
    case "scores": return <ScoresScreen />;
  }
}
```

> Note: `useBootstrap` is **not** called by App anymore — `DeviceRouter` (Task 4) owns it. Between Task 3 and Task 4 the app won't boot; that's fine, Task 4 immediately restores it. Do Tasks 3+4 back-to-back.

- [ ] **Step 3: Typecheck** — `npm run typecheck` → 0 errors (App may show unused-import errors until imports are trimmed; trim them).
- [ ] **Step 4: Commit** — `refactor(phone): hoist App boot effects into useBootstrap`

### Task 4: `DeviceRouter` + wire `main.tsx`

**Files:** Create `src/ui/DeviceRouter.tsx`; Modify `src/main.tsx`

- [ ] **Step 1: Create `DeviceRouter.tsx`**

```tsx
// src/ui/DeviceRouter.tsx
import { App } from "../App.js";
import { FitToViewport } from "./FitToViewport.js";
import { PhoneApp } from "./phone/PhoneApp.js";
import { useBootstrap } from "./useBootstrap.js";
import { useDeviceClass } from "./useDeviceClass.js";

/** Top-level fork. Phone-in-portrait gets the native PhoneApp; everything
 *  else (laptop, tablets, iPads, AND a phone held landscape) gets today's
 *  exact FitToViewport→App path. Bootstrap runs here so it's path-agnostic. */
export function DeviceRouter(): JSX.Element {
  useBootstrap();
  const { isPhone, portrait } = useDeviceClass();
  if (isPhone && portrait) return <PhoneApp />;
  return (
    <FitToViewport>
      <App />
    </FitToViewport>
  );
}
```

- [ ] **Step 2: Update `main.tsx`** — render `<DeviceRouter/>` (FitToViewport now lives inside it):

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { DeviceRouter } from "./ui/DeviceRouter.js";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <React.StrictMode>
    <DeviceRouter />
  </React.StrictMode>,
);
```

- [ ] **Step 3:** Task 5 creates `PhoneApp`; if doing these in sequence, create the Task 5 file before typechecking. Then `npm run typecheck` → 0 errors.
- [ ] **Step 4: Commit** (with Task 5) — `feat(phone): DeviceRouter forks phone-portrait to PhoneApp`

### Task 5: `PhoneApp` switch + `PhonePlaceholder`

**Files:** Create `src/ui/phone/PhoneApp.tsx`, `src/ui/phone/PhonePlaceholder.tsx`

- [ ] **Step 1: `PhonePlaceholder.tsx`** — temporary; carries the `phone-root` test marker.

```tsx
// src/ui/phone/PhonePlaceholder.tsx
export function PhonePlaceholder({ label }: { readonly label: string }): JSX.Element {
  return (
    <div data-testid="phone-root" style={{ height: "var(--app-h)", display: "grid", placeItems: "center" }}>
      <span>phone:{label}</span>
    </div>
  );
}
```

- [ ] **Step 2: `PhoneApp.tsx`** — mirror App's switch; real screens swapped in by later tasks. Reuse `LoadingScreen` + `HotSeatHandoff` now.

```tsx
// src/ui/phone/PhoneApp.tsx
import { useGameStore } from "../../store/gameStore.js";
import { LoadingScreen } from "../screens/LoadingScreen.js";
import { HotSeatHandoff } from "../components/HotSeatHandoff.js";
import { PhonePlaceholder } from "./PhonePlaceholder.js";

export function PhoneApp(): JSX.Element {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const game = useGameStore((s) => s.game);
  switch (screen.kind) {
    case "loading": return <LoadingScreen />;
    case "home": return <PhonePlaceholder label="home" />;
    case "new_game": return <PhonePlaceholder label="new_game" />;
    case "game": return <PhonePlaceholder label="game" />;
    case "handoff": {
      const nextName = game?.players[screen.nextPlayerIndex]?.name ?? "Next player";
      return <HotSeatHandoff nextPlayerName={nextName} onReady={() => setScreen({ kind: "game" })} />;
    }
    case "game_end": return <PhonePlaceholder label="game_end" />;
    case "tumbler": return <PhonePlaceholder label="tumbler" />;
    case "tumbler_end": return <PhonePlaceholder label="tumbler_end" />;
    case "spelling_bee": return <PhonePlaceholder label="spelling_bee" />;
    case "scores": return <PhonePlaceholder label="scores" />;
  }
}
```

- [ ] **Step 3: Typecheck + full existing suite** — `npm run typecheck`; `npm run test`; `npx playwright test` → all green (desktop path untouched).
- [ ] **Step 4: Commit** — `feat(phone): PhoneApp screen switch + placeholder`

### Task 6: Manifest allows portrait

**Files:** Modify `vite.config.ts`

- [ ] **Step 1:** Change `orientation: "landscape-primary"` → `orientation: "any"`.
- [ ] **Step 2: Build smoke** — `npm run build`; confirm `dist/manifest.webmanifest` contains `"orientation":"any"`.
- [ ] **Step 3: Commit** — `feat(phone): allow portrait install (manifest orientation: any)`

### Task 7: Routing guard e2e + phone helper

**Files:** Create `e2e/phone-helpers.ts`, `e2e/phone-routing.spec.ts`

- [ ] **Step 1: `phone-helpers.ts`** — the smoke `beforeEach` IDB seed, reusable.

```ts
// e2e/phone-helpers.ts
import type { Page } from "@playwright/test";

export async function freshPhoneHome(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("scrabble-babble");
      req.onsuccess = () => resolve(); req.onerror = () => resolve(); req.onblocked = () => resolve();
    });
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("scrabble-babble", 1);
      open.onupgradeneeded = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains("in_progress")) db.createObjectStore("in_progress");
        if (!db.objectStoreNames.contains("history")) db.createObjectStore("history", { keyPath: "id" });
        if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
      };
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction("settings", "readwrite");
        tx.objectStore("settings").put({ key: "current_user", value: "Tester" });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      open.onerror = () => reject(open.error);
    });
  });
  await page.reload();
}
```

- [ ] **Step 2: `phone-routing.spec.ts`**

```ts
import { test, expect } from "@playwright/test";
import { freshPhoneHome } from "./phone-helpers.js";

test.describe("DeviceRouter — phone portrait routes to PhoneApp", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("iPhone portrait shows the phone tree", async ({ page }) => {
    await freshPhoneHome(page);
    await expect(page.getByTestId("phone-root")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("DeviceRouter — desktop/tablet keeps the existing tree", () => {
  // Default config viewport (1180x820, no touch) → desktop path.
  test("no phone tree on the iPad/desktop viewport", async ({ page }) => {
    await freshPhoneHome(page);
    await expect(page.getByRole("heading", { name: /Scrabble Babble/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("phone-root")).toHaveCount(0);
  });
});
```

- [ ] **Step 3: Run** — `npx playwright test e2e/phone-routing.spec.ts` → PASS (verifies phone gate works AND big-screen path is untouched). If the phone case fails because `(any-pointer: coarse)` isn't matched under emulation, add `contextOptions`/confirm `hasTouch:true` sets coarse pointer (it does in chromium); otherwise widen `read()`'s touch check to also accept `(pointer: coarse)`.
- [ ] **Step 4: Commit** — `test(phone): routing guard — phone-portrait vs desktop tree`

---

## PHASE B — Shared component changes

### Task 8: `Rack` `tileSize`/`wrap` + `DraggableRackTile` `size`

**Files:** Modify `src/ui/components/DraggableRackTile.tsx`, `src/ui/components/Rack.tsx`

- [ ] **Step 1: `DraggableRackTile`** — add optional `size` (default 64), apply to wrapper + inner `Tile`:

```tsx
export interface DraggableRackTileProps {
  readonly tile: TileT;
  readonly rackIndex: number;
  readonly disabled: boolean;
  readonly selected: boolean;
  readonly onTap: () => void;
  readonly size?: number; // default 64 (iPad). Phone passes ~44.
}
// ...in the component signature: `size = 64,`
// wrapper style: width: size, height: size, (rest unchanged)
// inner: <Tile tile={tile} size={size} />
```

- [ ] **Step 2: `Rack`** — add optional `tileSize` (default 64) + `wrap` (default true). Apply `flexWrap`, pass `size` to each tile and the empty-slot placeholder:

```tsx
export interface RackProps {
  readonly rack: ReadonlyArray<TileT>;
  readonly rackOrder: ReadonlyArray<number>;
  readonly usedIndices: ReadonlySet<number>;
  readonly onTileTap?: ((rackIndex: number) => void) | undefined;
  readonly selectedIndex?: number | null | undefined;
  readonly tileSize?: number; // default 64
  readonly wrap?: boolean;    // default true
}
// signature: tileSize = 64, wrap = true,
// outer div: flexWrap: wrap ? "wrap" : "nowrap"
// empty slot: width: tileSize, height: tileSize
// tile: <DraggableRackTile ... size={tileSize} />
```

- [ ] **Step 3: Verify iPad unchanged** — `npm run typecheck`; `npx playwright test e2e/full-play.spec.ts e2e/smoke.spec.ts` → green (defaults reproduce current 64px/wrap rendering).
- [ ] **Step 4: Commit** — `feat(phone): Rack tileSize/wrap + DraggableRackTile size props (defaults preserve iPad)`

### Task 9: Extract `usePendingPreview` + `useLastMove`

**Files:** Create `src/ui/hooks/usePendingPreview.ts`, `src/ui/hooks/useLastMove.ts`; Modify `src/ui/screens/GameScreen.tsx`

- [ ] **Step 1:** Move the two `useMemo` bodies from `GameScreen.tsx` (the `pendingPreview` and `lastMove` blocks) into hooks with identical logic:

```ts
// usePendingPreview.ts — signature
export function usePendingPreview(
  game: GameState | null,
  pending: ReadonlyArray<PendingPlacement>,
  dictionary: TrieNode | null,
): { word: string; score: number | null } | null
// useLastMove.ts — signature
export function useLastMove(
  game: GameState | null,
): { word: string; score: number; name: string } | null
```
(Copy the exact existing implementations; import the same `pendingToMove`, `validatePlaceMove`, `scorePlaceMove`. Match the project's existing types for `PendingPlacement`.)

- [ ] **Step 2:** In `GameScreen.tsx`, replace the inline `useMemo`s with `const pendingPreview = usePendingPreview(game, pending, dictionary);` and `const lastMove = useLastMove(game);`. No other change.
- [ ] **Step 3: Verify identical** — `npm run typecheck`; `npx playwright test e2e/full-play.spec.ts` → green (GameScreen renders the same).
- [ ] **Step 4: Commit** — `refactor(phone): share pending-preview + last-move as hooks`

---

## PHASE C — Phone shell + menus

> From here, each screen task: (1) build a real compiling skeleton using the listed store API + reused components, wrapped in `PhoneShell`; (2) write/raise its Playwright contract test to green; (3) **polish with ui-ux-pro-max**, capture an iPhone-viewport screenshot via the Preview MCP for owner sign-off; (4) commit. All phone screens pin to `height: var(--app-h); overflow: hidden` and scroll inner lists. Reuse design `tokens`. Honour `env(safe-area-inset-*)` in `PhoneTopBar` (top) and `PhoneActionBar` (bottom).

### Task 10: `PhoneShell` + `PhoneTopBar` + `PhoneNavButton` + `PhoneHome`

**Files:** Create `src/ui/phone/PhoneShell.tsx`, `src/ui/phone/components/PhoneTopBar.tsx`, `src/ui/phone/components/PhoneNavButton.tsx`, `src/ui/phone/screens/PhoneHome.tsx`; Modify `PhoneApp.tsx` (route `home`); Create `e2e/phone-home.spec.ts`

- [ ] **Step 1: `PhoneShell`** — portrait frame carrying the `phone-root` marker, paper grain, safe-area padding, `var(--app-h)` pin, optional top bar slot:

```tsx
// src/ui/phone/PhoneShell.tsx
import type { ReactNode } from "react";
import { tokens } from "../tokens.js";
export function PhoneShell({ top, children }: { readonly top?: ReactNode; readonly children: ReactNode }): JSX.Element {
  return (
    <div data-testid="phone-root" style={{
      height: "var(--app-h)", maxHeight: "var(--app-h)", overflow: "hidden",
      display: "flex", flexDirection: "column", background: tokens.color.cream,
    }}>
      {top}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: `PhoneTopBar`** — back chevron (reuse `playUiTap`), centered title, optional trailing node; safe-area top inset.
- [ ] **Step 3: `PhoneNavButton`** — full-width ≥56px menu button (primary/secondary), using `tokens`.
- [ ] **Step 4: `PhoneHome`** — `PhoneShell` + vertical stack: wordmark heading `Scrabble Babble` (keep this exact accessible name), `Resume` (only when `useGameStore(s => s.game)` has an in-progress, resumable game — match HomeScreen's resume condition), then `New game`, `Tumbler`, `Spelling Bee`, `Scores` nav buttons calling `setScreen({kind:...})`. Reuse the same button text as desktop so shared selectors hold.
- [ ] **Step 5:** Route `home` in `PhoneApp` to `<PhoneHome/>`.
- [ ] **Step 6: `phone-home.spec.ts`**

```ts
import { test, expect } from "@playwright/test";
import { freshPhoneHome } from "./phone-helpers.js";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test("phone home shows all entry points and navigates", async ({ page }) => {
  await freshPhoneHome(page);
  await expect(page.getByRole("heading", { name: /Scrabble Babble/ })).toBeVisible({ timeout: 10_000 });
  for (const name of [/New game/, /Tumbler/, /Spelling Bee/, /Scores/]) {
    await expect(page.getByRole("button", { name })).toBeVisible();
  }
  await page.getByRole("button", { name: /Tumbler/ }).click();
  await expect(page.getByRole("heading", { name: /^Tumbler$/ })).toBeVisible({ timeout: 10_000 });
});
```
> `Tumbler` still routes to a placeholder until Task 15 — adjust this assertion to `getByTestId("phone-root")` until then, or land Task 10's nav test against `New game`→placeholder. Keep the heading assertion once Task 15 ships.

- [ ] **Step 7:** Run the spec → green. Polish with ui-ux-pro-max + screenshot. Commit — `feat(phone): home screen + portrait shell`

### Task 11: `PhoneScores`

**Files:** Create `src/ui/phone/screens/PhoneScores.tsx`; Modify `PhoneApp.tsx`

- [ ] **Step 1:** Read `ScoresScreen.tsx` for its store API + leaderboard source. Build `PhoneScores` = `PhoneShell` + `PhoneTopBar` (title "Scores", back→home) + single-column leaderboard list reusing the same entry rendering/format. Route `scores`.
- [ ] **Step 2:** Extend `phone-home.spec.ts` (or new `phone-scores.spec.ts`): Home → Scores → list visible → back → Home. Run green.
- [ ] **Step 3:** ui-ux-pro-max polish + screenshot. Commit — `feat(phone): scores screen`

### Task 12: `PhoneNewGame` (Mini default on phone)

**Files:** Create `src/ui/phone/screens/PhoneNewGame.tsx`; Modify `PhoneApp.tsx`; Create `e2e/phone-newgame.spec.ts`

- [ ] **Step 1:** Read `NewGameScreen.tsx` for its controls + start action. Build `PhoneNewGame` mirroring them vertically: opponent (Hot-seat / Computer + difficulty when Computer), variant cards (Classic / Random / Mini), name input(s), `Start game`. **Initialize the variant selection to `"mini"`** (do not read `settings.variant` for the initial value — this is the phone default). Keep button texts identical to desktop (`Hot-seat`, `Computer`, `Classic`, `Random`, `Mini`, `Start game`).
- [ ] **Step 2:** Route `new_game`.
- [ ] **Step 3: `phone-newgame.spec.ts`**

```ts
import { test, expect } from "@playwright/test";
import { freshPhoneHome } from "./phone-helpers.js";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test("phone New Game defaults to Mini and starts a game", async ({ page }) => {
  await freshPhoneHome(page);
  await page.getByRole("button", { name: /New game/ }).click();
  await expect(page.getByRole("heading", { name: /New game/ })).toBeVisible();
  // Mini is the pre-selected variant on phone (assert via its selected/aria-pressed state).
  await expect(page.getByRole("button", { name: /Mini/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Start game/ }).click();
  await expect(page.getByRole("button", { name: /^Pass$/ })).toBeVisible({ timeout: 10_000 });
});
```
> If `BoardOption` doesn't expose `aria-pressed`, assert selection via its visual selected marker / a `data-selected` attribute added in this task. Confirm against the real `BoardOption` component.

- [ ] **Step 4:** Run green. ui-ux-pro-max polish + screenshot. Commit — `feat(phone): new game (Mini default)`

---

## PHASE D — Phone board game

### Task 13: `PhoneActionBar` + `PhoneGame`

**Files:** Create `src/ui/phone/components/PhoneActionBar.tsx`, `src/ui/phone/screens/PhoneGame.tsx`; Modify `PhoneApp.tsx`; Create `e2e/phone-game.spec.ts`

**Store/engine API (same as `GameScreen`):** selectors `game, dictionary, pending, rackOrder, error, pendingBlankAt, aiPlayerIndex, settings.opponent, settings.variant, thinking, currentUser`; actions `placeFromRack, movePending, recallOne, setBlankLetter, cancelBlankPicker, submitMove, recallPending, shuffleRack, swap, pass, resign, applyAiMove, setThinking, goHome, setScreen`. Derived values via `usePendingPreview`/`useLastMove` (Task 9). Reuse `Board`, `Rack` (with `tileSize≈44, wrap={false}`), `Tile` (DragOverlay), `BlankLetterPicker`, `SwapPicker`, `ModalFrame`, `ThinkingOverlay`. Copy the AI-driver effect + the `@dnd-kit` sensor config + drag handlers from `GameScreen` (identical behaviour).

- [ ] **Step 1: Skeleton** — `PhoneGame` wrapped in its own `DndContext`, inside `PhoneShell`, laid out top→bottom: `PhoneTopBar` (back, `variantLabel`, tiles-left); compact player rows (reuse `PlayerCard` or a compact phone variant); a one-line move-status strip (word + score, error tint) using the shared hooks; `<Board .../>` in a width-constrained square; `<Rack tileSize={44} wrap={false} .../>`; `PhoneActionBar` (Submit primary + Recall/Shuffle/Swap/Pass icons + Resign under a `⋯` sheet). Wire `onCellTap`/`onRackTap`/drag exactly as `GameScreen`.
- [ ] **Step 2: `PhoneActionBar`** — single row; `Submit` shows pending count; disabled states match `GameScreen` (`canSwap = bag.length >= rules.minBagToSwap`, etc.).
- [ ] **Step 3:** Route `game`; ensure `handoff` (already wired) returns to `game` which now renders `PhoneGame`.
- [ ] **Step 4: `phone-game.spec.ts`** — start a Mini hot-seat game from phone New Game, place one tile (tap a rack tile → tap centre/an empty cell), assert Submit reflects 1 tile, board + action bar visible within the 844px viewport (no clip), pass works.

```ts
import { test, expect } from "@playwright/test";
import { freshPhoneHome } from "./phone-helpers.js";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test("phone board game: place a tile, controls stay on-screen", async ({ page }) => {
  await freshPhoneHome(page);
  await page.getByRole("button", { name: /New game/ }).click();
  await page.getByRole("button", { name: /Start game/ }).click(); // Mini default
  await expect(page.getByRole("button", { name: /^Pass$/ })).toBeVisible({ timeout: 10_000 });
  // Tap-to-place: select first rack tile, tap the centre star cell.
  // (Use the rack tile + board cell roles/test-ids exposed by the reused components;
  //  confirm exact selectors against Rack/BoardCell when implementing.)
  const submit = page.getByRole("button", { name: /^Submit/ });
  const box = await submit.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(844); // action bar within viewport
});
```
> Flesh the place-a-tile interaction using the same selectors the existing `full-play.spec.ts` uses for rack/board (read it when implementing). Keep the within-viewport assertion as the anti-clip guard.

- [ ] **Step 5:** Run green. **ui-ux-pro-max polish** (cell size, rack fit, action density) + iPhone screenshot for sign-off. Commit — `feat(phone): board game (vs AI + hot-seat) portrait layout`

### Task 14: `PhoneGameEnd`

**Files:** Create `src/ui/phone/screens/PhoneGameEnd.tsx`; Modify `PhoneApp.tsx`

- [ ] **Step 1:** Read `GameEndScreen.tsx` for its store API. Build single-column: winner banner, per-player final scores, `Rematch`/`Home` actions. Route `game_end`.
- [ ] **Step 2:** Extend `phone-game.spec.ts` or add a check: resign → end screen shows + actions within viewport.
- [ ] **Step 3:** ui-ux-pro-max polish + screenshot. Commit — `feat(phone): game end screen`

---

## PHASE E — Solo games

### Task 15: `PhoneTumbler`

**Files:** Create `src/ui/phone/screens/PhoneTumbler.tsx`; Modify `PhoneApp.tsx`; Create `e2e/phone-tumbler.spec.ts`

- [ ] **Step 1:** Read `TumblerScreen.tsx` for store API (rack/letters, input, timer start-on-keystroke, pause-on-blur, score, submit). Build vertical: `PhoneTopBar` (back, "Tumbler"); 7 letter pills + score/time readout; input + Submit; found-words list scrolls (`flex:1, minHeight:0, overflowY:auto`). Reuse the engine + store; only re-lay-out. Route `tumbler`.
- [ ] **Step 2: `phone-tumbler.spec.ts`** — open Tumbler, 7 letter pills present, `Time`/`Score` readouts visible, a single-letter submit shows the too-short message (mirror smoke test assertions at phone viewport).
- [ ] **Step 3:** Run green. ui-ux-pro-max polish + screenshot. Commit — `feat(phone): tumbler screen`

### Task 16: `PhoneTumblerEnd`

**Files:** Create `src/ui/phone/screens/PhoneTumblerEnd.tsx`; Modify `PhoneApp.tsx`; Create `e2e/phone-endscreens.spec.ts`

- [ ] **Step 1:** Single column inside `PhoneShell` (pinned, scroll): score header → CompareBar → "Words you found" (`FoundList`) → `PossibleWordsCard`. Reuse those components. Route `tumbler_end`.
- [ ] **Step 2: `phone-endscreens.spec.ts`** — play a Tumbler round to completion at phone viewport (reuse the seed/clock technique from `tumbler-endscreen-fit.spec.ts`: `page.clock.install()` + `pauseAt(future T whose low 31 bits = seed)` + `fastForward(61_000)`), assert "Round complete" + that Restart/Play-again buttons sit within the 844px viewport (no clip — same guard shape as the iPad fit spec).
- [ ] **Step 3:** Run green. ui-ux-pro-max polish + screenshot. Commit — `feat(phone): tumbler end screen (no clip)`

### Task 17: `PhoneSpellingBee`

**Files:** Create `src/ui/phone/screens/PhoneSpellingBee.tsx`; Modify `PhoneApp.tsx`; Create `e2e/phone-bee.spec.ts`

- [ ] **Step 1:** Read `SpellingBeeScreen.tsx` for store/engine API. Build vertical: `PhoneTopBar` (back, "Spelling Bee"); the existing 320px hex (reused as-is); input + Submit; found list scrolls; score/rank. Route `spelling_bee`.
- [ ] **Step 2: `phone-bee.spec.ts`** — open Bee, `Letter hex` visible, 7 pills, too-short rejection (mirror smoke assertions at phone viewport).
- [ ] **Step 3:** Run green. ui-ux-pro-max polish + screenshot. Commit — `feat(phone): spelling bee screen`

---

## PHASE F — Polish & close

### Task 18: Cleanup, full regression, docs

**Files:** Delete `src/ui/phone/PhonePlaceholder.tsx`; Modify `docs/GOTCHAS.md`, `docs/BACKLOG.md`, `C:\dev\projects\scrabble-babble\CLAUDE.md`

- [ ] **Step 1:** Remove `PhonePlaceholder` + any remaining references in `PhoneApp` (all cases now route to real screens).
- [ ] **Step 2: Full gate** — `npm run typecheck` (0); `npm run test` (green); `npm run lint:engine-purity` (clean); `npx playwright test` (ALL specs green, incl. the original iPad suite as the no-regression proof).
- [ ] **Step 3: Owner sign-off pass** — with the Preview MCP at 390×844, screenshot every phone screen; present the set to the owner; apply ui-ux-pro-max tweaks from feedback.
- [ ] **Step 4: Docs** — add a `## Phase 5 (phone portrait)` section to `docs/GOTCHAS.md` (the `(any-pointer: coarse)` + `hasTouch` emulation note; the `--app-h`-on-phone note; rotation-preserves-store note; the 540 short-side rationale). Add Phase 5 row to the CLAUDE.md phase table. Move any deferred phone ideas (board pinch-zoom, native phone-landscape) to `docs/BACKLOG.md`.
- [ ] **Step 5: Commit** — `chore(phone): cleanup, docs, Phase 5 close`

---

## Self-review notes (author)

- **Spec coverage:** routing (Tasks 1–7), support-both via the else-branch (Task 4), Mini default (Task 12), all 9 screens (Tasks 5,10–17), manifest (Task 6), shared-logic hooks (Task 9), Rack tileSize (Task 8), tests + regression guard (Tasks 7,18) — all map to spec sections.
- **Sequencing risk:** Tasks 3+4 must land together (App can't boot in between) — flagged in Task 3.
- **Selector unknowns** (BoardOption `aria-pressed`, rack/board test ids) are called out where they appear; resolve against the real components at implementation time rather than guessing.
- **UI workflow:** screen JSX is intentionally built live with ui-ux-pro-max + screenshots (project rule), with the Playwright contract test + within-viewport assertions as the objective gate — not left as placeholders.
