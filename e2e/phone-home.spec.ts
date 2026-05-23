import { test, expect } from "@playwright/test";
import { freshPhoneHome } from "./phone-helpers.js";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test("phone home shows all entry points", async ({ page }) => {
  await freshPhoneHome(page);
  await expect(page.getByRole("heading", { name: /Scrabble Babble/ })).toBeVisible({ timeout: 10_000 });
  for (const name of [/New game/, /Tumbler/, /Spelling Bee/, /Scores/]) {
    await expect(page.getByRole("button", { name })).toBeVisible();
  }
  await page.screenshot({ path: "screenshots/phone-01-home.png" });
});
