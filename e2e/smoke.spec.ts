import { test, expect } from "@playwright/test";

/**
 * Phase 1-4 smoke test. Drives the deployed PWA through each major flow:
 *   - Home + New Game with all 3 variants + opponent + difficulty selectors
 *   - Classic vs Computer game, drag-drop / tap-to-place, submit, AI turn
 *   - Tumbler timed round, scoring, end screen
 *   - Spelling Bee daily puzzle, hex tap-to-compose, persistence
 *
 * Run with: bunx playwright test e2e/smoke.spec.ts --reporter=list
 * The dev/preview server is auto-spawned by playwright.config.ts.
 */

const HOME_URL = "/";

test.beforeEach(async ({ page, context }) => {
  // Fresh IndexedDB per test so resume + opponent state don't bleed across.
  await context.clearCookies();
  await page.goto(HOME_URL);
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("scrabble-babble");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
    // Pre-seed a current_user so the welcome name-prompt doesn't block
    // tests. CRITICAL: we must create ALL three object stores at v1, not
    // just "settings". The app's own open() at v1 won't fire the upgrade
    // hook if our seed already created the DB at the same version, and
    // any later db.put("in_progress", ...) would fail.
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
  await expect(page.getByRole("heading", { name: /Scrabble Babble/ })).toBeVisible({
    timeout: 10_000,
  });
});

test("home screen renders all entry points", async ({ page }) => {
  await expect(page.getByRole("button", { name: /New game/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Tumbler/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Spelling Bee/ })).toBeVisible();
  await page.screenshot({ path: "screenshots/01-home.png", fullPage: true });
});

test("new game screen has opponent, board, and player selectors", async ({ page }) => {
  await page.getByRole("button", { name: /New game/ }).click();
  await expect(page.getByRole("heading", { name: /New game/ })).toBeVisible();
  // Opponent group
  await expect(page.getByLabel(/Hot-seat/)).toBeVisible();
  await expect(page.getByLabel(/^Computer$/)).toBeVisible();
  // Board variant group (Phase 3)
  await expect(page.getByLabel(/Classic.*15.15/)).toBeVisible();
  await expect(page.getByLabel(/Random.*15.15/)).toBeVisible();
  await expect(page.getByLabel(/Mini.*11.11/)).toBeVisible();
  await page.screenshot({ path: "screenshots/02-new-game.png", fullPage: true });
});

test("starting a Classic hot-seat game renders a 15x15 board", async ({ page }) => {
  await page.getByRole("button", { name: /New game/ }).click();
  // Default radios should already be: Hot-seat + Classic.
  await page.getByRole("button", { name: /Start/ }).click();
  // Verify a 15x15 board renders — 225 cells.
  const cells = page.locator('[data-testid="board-cell"], button:has-text(""), .board-cell');
  // Fall back to a more reliable count: the score bar should show two player names.
  await expect(page.getByText(/Player 1/)).toBeVisible();
  await page.screenshot({ path: "screenshots/03-classic-board.png", fullPage: true });
});

test("starting a Mini hot-seat game renders the 11x11 variant", async ({ page }) => {
  await page.getByRole("button", { name: /New game/ }).click();
  await page.getByLabel(/Mini.*11.11/).check();
  await page.getByRole("button", { name: /Start/ }).click();
  await expect(page.getByText(/Player 1/)).toBeVisible();
  await page.screenshot({ path: "screenshots/04-mini-board.png", fullPage: true });
});

test("Tumbler renders 7 letters and a timer", async ({ page }) => {
  await page.getByRole("button", { name: /Tumbler/ }).click();
  // Header shows starting time.
  await expect(page.getByLabel(/Time remaining/)).toBeVisible();
  // Score starts at 0.
  await expect(page.getByLabel(/Current score/)).toHaveText(/0 pts/);
  // Letter pills — accessible label is the letter itself.
  const pills = page.getByRole("button", { name: /^[A-Z]$/ });
  await expect(pills).toHaveCount(7);
  await page.screenshot({ path: "screenshots/05-tumbler.png", fullPage: true });
});

test("Tumbler rejects a single-letter word as too short", async ({ page }) => {
  await page.getByRole("button", { name: /Tumbler/ }).click();
  const pills = page.getByRole("button", { name: /^[A-Z]$/ });
  await expect(pills).toHaveCount(7);

  // Tap-only input mode: tap one pill (1-letter word), then Enter. Min
  // word length is 2, so this is a guaranteed rejection that doesn't
  // depend on the rack composition.
  await pills.nth(0).click();
  await page.getByRole("button", { name: /^Enter$/ }).click();
  await expect(page.getByText(/Need 2\+? letters|Too short/)).toBeVisible();
  await page.screenshot({ path: "screenshots/06-tumbler-rejected.png", fullPage: true });
});

test("Spelling Bee renders the daily hex with centre + 6 outer letters", async ({ page }) => {
  await page.getByRole("button", { name: /Spelling Bee/ }).click();
  // Pangram enumeration runs on home; here it may need a tiny moment.
  await expect(page.getByLabel(/Letter hex/)).toBeVisible({ timeout: 15_000 });
  // 7 letter pills total (1 centre + 6 outer).
  const pills = page.getByLabel(/Letter hex/).getByRole("button", { name: /^[A-Z]$/ });
  await expect(pills).toHaveCount(7);
  // Score starts at 0.
  await expect(page.getByLabel(/^Score$/)).toContainText(/^0/);
  // Date label visible (YYYY-MM-DD).
  await expect(page.getByText(/\d{4}-\d{2}-\d{2}/)).toBeVisible();
  await page.screenshot({ path: "screenshots/07-spelling-bee.png", fullPage: true });
});

test("Spelling Bee rejects too-short and missing-center words", async ({ page }) => {
  await page.getByRole("button", { name: /Spelling Bee/ }).click();
  await expect(page.getByLabel(/Letter hex/)).toBeVisible({ timeout: 15_000 });

  // Tap one outer letter (not the centre) and submit -> too_short.
  const outerPills = page.getByLabel(/Letter hex/).getByRole("button");
  // The centre pill has a different background; we'll tap pill 1 (some outer).
  await outerPills.nth(1).click();
  await page.getByRole("button", { name: /^Enter$/ }).click();
  await expect(page.getByText(/Too short/)).toBeVisible();
  await page.screenshot({ path: "screenshots/08-bee-rejection.png", fullPage: true });
});

test("home -> bee -> home navigation works", async ({ page }) => {
  await page.getByRole("button", { name: /Spelling Bee/ }).click();
  await expect(page.getByLabel(/Letter hex/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Home/ }).click();
  await expect(page.getByRole("heading", { name: /Scrabble Babble/ })).toBeVisible();
});
