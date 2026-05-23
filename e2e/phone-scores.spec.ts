import { test, expect } from "@playwright/test";
import { freshPhoneHome } from "./phone-helpers.js";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test("phone Scores opens and returns home", async ({ page }) => {
  await freshPhoneHome(page);
  await page.getByRole("button", { name: /Scores/ }).click();
  await expect(page.getByRole("heading", { name: /Scores/ })).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: "screenshots/phone-03-scores.png" });
  await page.getByRole("button", { name: /back to home/i }).click();
  await expect(page.getByRole("heading", { name: /Scrabble Babble/ })).toBeVisible();
});
