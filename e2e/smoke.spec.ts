import { test, expect } from "@playwright/test";

/**
 * Phase 1-4 smoke test. Drives the deployed PWA through each major flow:
 *   - Home + New Game with all 3 variants + opponent + difficulty selectors
 *   - Classic / Mini hot-seat games render a board
 *   - Tumbler timed round: 7 letters, timer, too-short rejection
 *   - Spelling Bee daily puzzle: hex, too-short rejection
 *
 * Run with: npx playwright test e2e/smoke.spec.ts --reporter=list
 * The preview server is auto-spawned by playwright.config.ts (via npm).
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
    // Pre-seed a current_user so the welcome name-prompt doesn't block tests.
    // CRITICAL: create ALL three object stores at v1 (see comment history).
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
  // Opponent — Segmented control (buttons, not radios).
  await expect(page.getByRole("button", { name: /Hot-seat/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Computer$/ })).toBeVisible();
  // Board variant — BoardOption buttons (Phase 3).
  await expect(page.getByRole("button", { name: /Classic/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Random/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Mini/ })).toBeVisible();
  await page.screenshot({ path: "screenshots/02-new-game.png", fullPage: true });
});

test("starting a Classic hot-seat game renders a board", async ({ page }) => {
  await page.getByRole("button", { name: /New game/ }).click();
  // Default selections: Hot-seat + Classic.
  await page.getByRole("button", { name: /Start game/ }).click();
  // Board rendered → the centre star + the action bar are present.
  await expect(page.getByRole("button", { name: /^Pass$/ })).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: "screenshots/03-classic-board.png", fullPage: true });
});

test("starting a Mini hot-seat game renders the 11x11 variant", async ({ page }) => {
  await page.getByRole("button", { name: /New game/ }).click();
  await page.getByRole("button", { name: /Mini/ }).click();
  await page.getByRole("button", { name: /Start game/ }).click();
  await expect(page.getByRole("button", { name: /^Pass$/ })).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: "screenshots/04-mini-board.png", fullPage: true });
});

test("Tumbler renders 7 letters and a timer", async ({ page }) => {
  await page.getByRole("button", { name: /Tumbler/ }).click();
  await expect(page.getByRole("heading", { name: /^Tumbler$/ })).toBeVisible();
  // Letter pills — accessible label is "Letter X".
  const pills = page.getByRole("button", { name: /^Letter [A-Z]$/ });
  await expect(pills).toHaveCount(7);
  // Time + Score readout panels are present.
  await expect(page.getByText("Time", { exact: true })).toBeVisible();
  await expect(page.getByText("Score", { exact: true })).toBeVisible();
  await page.screenshot({ path: "screenshots/05-tumbler.png", fullPage: true });
});

test("Tumbler rejects a single-letter word as too short", async ({ page }) => {
  await page.getByRole("button", { name: /Tumbler/ }).click();
  const pills = page.getByRole("button", { name: /^Letter [A-Z]$/ });
  await expect(pills).toHaveCount(7);

  // Tap one pill (1-letter word), then Submit. Min length is 2, so this is a
  // guaranteed rejection regardless of the rack composition.
  await pills.nth(0).click();
  await page.getByRole("button", { name: /^Submit$/ }).click();
  await expect(page.getByText(/Need 2\+? letters|Too short/)).toBeVisible();
  await page.screenshot({ path: "screenshots/06-tumbler-rejected.png", fullPage: true });
});

test("Spelling Bee renders the daily hex with centre + 6 outer letters", async ({ page }) => {
  await page.getByRole("button", { name: /Spelling Bee/ }).click();
  // Pangram enumeration runs on home; here it may need a tiny moment.
  await expect(page.getByLabel(/Letter hex/)).toBeVisible({ timeout: 15_000 });
  // 7 letter pills total (1 centre + 6 outer).
  const pills = page.getByLabel(/Letter hex/).getByRole("button", { name: /^Letter [A-Z]$/ });
  await expect(pills).toHaveCount(7);
  await page.screenshot({ path: "screenshots/07-spelling-bee.png", fullPage: true });
});

test("Spelling Bee rejects a too-short word", async ({ page }) => {
  await page.getByRole("button", { name: /Spelling Bee/ }).click();
  await expect(page.getByLabel(/Letter hex/)).toBeVisible({ timeout: 15_000 });

  // Tap one letter (min Bee word length is 4) and submit → too short.
  const pills = page.getByLabel(/Letter hex/).getByRole("button", { name: /^Letter [A-Z]$/ });
  await pills.nth(1).click();
  await page.getByRole("button", { name: /^Submit$/ }).click();
  await expect(page.getByText(/Too short/)).toBeVisible();
  await page.screenshot({ path: "screenshots/08-bee-rejection.png", fullPage: true });
});

test("home -> bee -> home navigation works", async ({ page }) => {
  await page.getByRole("button", { name: /Spelling Bee/ }).click();
  await expect(page.getByLabel(/Letter hex/)).toBeVisible({ timeout: 15_000 });
  // Back-to-home pill has aria-label "Back to home" (lowercase).
  await page.getByRole("button", { name: /back to home/i }).click();
  await expect(page.getByRole("heading", { name: /Scrabble Babble/ })).toBeVisible();
});
