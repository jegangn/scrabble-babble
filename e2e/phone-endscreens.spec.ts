import { test, expect } from "@playwright/test";
import { freshPhoneHome } from "./phone-helpers.js";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test("phone tumbler-end fits — actions reachable", async ({ page }) => {
  await freshPhoneHome(page);
  await page.clock.install();
  await page.clock.pauseAt(900 * 2 ** 31 + 12345);
  await page.getByRole("button", { name: /Tumbler/ }).click();
  await expect(page.getByRole("heading", { name: /^Tumbler$/ })).toBeVisible({ timeout: 10_000 });
  // Start the timer by clicking any rack tile (PhoneTumbler only starts on first keystroke).
  const pills = page.getByRole("button", { name: /^Letter [A-Z]$/ });
  await expect(pills).toHaveCount(7);
  await pills.nth(0).click();
  await page.clock.fastForward(61_000);
  await expect(page.getByText(/Round complete/i)).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: "screenshots/phone-07-tumblerend.png" });
  const playAgain = page.getByRole("button", { name: /Play again/ });
  await expect(playAgain).toBeVisible();
  const box = await playAgain.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(844); // actions within viewport
});
