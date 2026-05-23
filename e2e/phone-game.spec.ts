import { test, expect } from "@playwright/test";
import { freshPhoneHome } from "./phone-helpers.js";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test("phone board game: start, place a tile, controls stay on-screen", async ({ page }) => {
  await freshPhoneHome(page);

  // Navigate to New Game → start with phone defaults (Mini, hot-seat).
  await page.getByRole("button", { name: /New game/ }).click();
  await page.getByRole("button", { name: /Start game/ }).click();

  // Board must be visible (game-board data-testid added to Board.tsx).
  const board = page.getByTestId("game-board");
  await expect(board).toBeVisible({ timeout: 10_000 });

  // --- Tap-to-place: select first rack tile, then tap the centre cell ---
  //
  // Rack tiles are [role="button"] children of the rack (brown felt strip).
  // We pick the first available tile — all tiles start available on turn 1.
  //
  // The centre cell on Mini 11×11 is (5,5). Its button contains the star
  // SVG (aria-hidden); it is the only board cell that has an <svg> child.
  const rackTile = page.locator('[role="button"]').filter({
    // Exclude back/nav buttons (they are <button>, not role="button" divs).
    // DraggableRackTile renders a div[role="button"] so this uniquely targets
    // rack tiles once the board is loaded.
    hasNot: page.locator("svg"),
  }).first();

  await expect(rackTile).toBeVisible({ timeout: 5_000 });
  await rackTile.click();

  // Centre cell — the only board button that contains an <svg> child.
  const centreCell = board.locator("button").filter({ has: page.locator("svg") }).first();
  await expect(centreCell).toBeVisible({ timeout: 5_000 });
  await centreCell.click();

  // After placing, the Submit button should be enabled.
  const submit = page.getByRole("button", { name: /^Submit/ });
  await expect(submit).toBeVisible({ timeout: 10_000 });
  await expect(submit).toBeEnabled();

  // Anti-clip: the entire Submit button must fit within the 844 px viewport.
  const box = await submit.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);

  await page.screenshot({ path: "screenshots/phone-04-game.png" });
});
