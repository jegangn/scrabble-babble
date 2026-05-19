/**
 * Visual audit: walk every screen at iPad and Tab-S8 landscape viewports
 * and screenshot. The assertions are minimal — these are reviewed visually,
 * not by pixel diff. Goal: catch overlap, clipping, misaligned controls,
 * touch targets too close together, and so on.
 *
 * Tests run against the preview server (webServer in playwright.config.ts).
 */
import { test, expect, type Page } from "@playwright/test";
import { promises as fs } from "node:fs";
import * as path from "node:path";

const OUT = "screenshots/visual-audit";

const VIEWPORTS = {
  // iPad Pro 11" landscape (the original target)
  ipad: { width: 1180, height: 820 },
  // Galaxy Tab S8 landscape — effective CSS pixels at default zoom (~1340×800)
  tabS8: { width: 1340, height: 800 },
} as const;

async function shot(page: Page, name: string, viewport: keyof typeof VIEWPORTS) {
  const dir = path.join(OUT, viewport);
  await fs.mkdir(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `${name}.png`),
    fullPage: false,
  });
}

async function gotoHome(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^new game$/i })).toBeVisible({
    timeout: 20_000,
  });
}

for (const [vpName, vp] of Object.entries(VIEWPORTS) as Array<
  [keyof typeof VIEWPORTS, (typeof VIEWPORTS)[keyof typeof VIEWPORTS]]
>) {
  test.describe(`visual audit @ ${vpName} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: vp });

    test("Home", async ({ page }) => {
      await gotoHome(page);
      await shot(page, "01-home", vpName);
    });

    test("NewGame — default (Classic + hot-seat)", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^new game$/i }).click();
      await expect(page.getByText(/opponent/i).first()).toBeVisible({ timeout: 5000 });
      await shot(page, "02-new-game-default", vpName);
    });

    test("NewGame — Mini + AI Medium", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^new game$/i }).click();
      await page.getByLabel(/^computer$/i).check();
      await page.getByLabel(/^mini —/i).check();
      // After picking AI, the difficulty fieldset replaces Player 2 input.
      await expect(page.getByText(/difficulty/i).first()).toBeVisible();
      await shot(page, "03-new-game-mini-ai", vpName);
    });

    test("Game — Classic, hot-seat", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^new game$/i }).click();
      await page.getByRole("button", { name: /^start$/i }).click();
      // Board rendered when the centre ★ appears.
      await expect(page.getByText("★").first()).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(500);
      await shot(page, "04-game-classic", vpName);
    });

    test("Game — Mini, hot-seat", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^new game$/i }).click();
      await page.getByLabel(/^mini —/i).check();
      await page.getByRole("button", { name: /^start$/i }).click();
      await expect(page.getByText("★").first()).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(500);
      await shot(page, "05-game-mini", vpName);
    });

    test("Tumbler", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /tumbler/i }).click();
      // The 7-letter rack region appears once the round starts.
      await expect(page.getByLabel(/your letters/i)).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(300);
      await shot(page, "06-tumbler-start", vpName);

      // Type "CAT" into the word entry input (timer starts on first keystroke).
      await page.getByLabel(/word entry/i).fill("CAT");
      await shot(page, "06b-tumbler-typed", vpName);
    });

    test("Spelling Bee", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /spelling bee/i }).click();
      await expect(page.getByLabel(/letter hex/i)).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(800); // let total-words enumerator settle
      await shot(page, "07-bee-start", vpName);

      // Tap centre + a couple outer letters to show in-progress word.
      const pills = await page.locator("[aria-label='Letter hex'] button").all();
      for (let i = 0; i < Math.min(4, pills.length); i++) {
        await pills[i]!.click();
      }
      await shot(page, "07b-bee-typing", vpName);
    });

    test("Resign confirm modal + GameEnd screen", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^new game$/i }).click();
      await page.getByRole("button", { name: /^start$/i }).click();
      // Open Resign confirmation.
      await page.getByRole("button", { name: /^resign$/i }).click();
      await expect(page.getByText(/this ends the game/i)).toBeVisible();
      await shot(page, "08-resign-modal", vpName);

      // Confirm — the destructive button is intentionally NOT labelled
      // "Resign" (which would match the trigger) but "End game now".
      await page.getByRole("button", { name: /end game now/i }).click();
      await expect(page.getByRole("button", { name: /home|new game/i }).first()).toBeVisible({
        timeout: 5000,
      });
      await page.waitForTimeout(300);
      await shot(page, "09-game-end", vpName);
    });

    test("Swap modal opens with rack tiles", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^new game$/i }).click();
      await page.getByRole("button", { name: /^start$/i }).click();
      await expect(page.getByText("★").first()).toBeVisible({ timeout: 10_000 });
      // Swap should be enabled at game start (bag has 90+ tiles).
      const swapBtn = page.getByRole("button", { name: /^swap$/i });
      await expect(swapBtn).toBeEnabled();
      await swapBtn.click();
      // SwapPicker is a Modal with the rack tiles inside.
      await expect(page.getByText(/swap/i).first()).toBeVisible();
      await page.waitForTimeout(200);
      await shot(page, "10-swap-modal", vpName);
    });

    test("HotSeatHandoff after passing in hot-seat", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^new game$/i }).click();
      await page.getByRole("button", { name: /^start$/i }).click();
      await expect(page.getByText("★").first()).toBeVisible({ timeout: 10_000 });
      // Pass — that flips the turn, which in hot-seat shows the handoff overlay.
      await page.getByRole("button", { name: /^pass$/i }).click();
      // Handoff overlay shows "Pass the iPad to <name>" and a Ready button.
      await expect(page.getByText(/pass the ipad to/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole("button", { name: /ready/i })).toBeVisible();
      await page.waitForTimeout(200);
      await shot(page, "11-handoff", vpName);
      // Tapping Ready returns to the game.
      await page.getByRole("button", { name: /ready/i }).click();
      await expect(page.getByText("★").first()).toBeVisible();
    });
  });
}
