import { test, expect } from "@playwright/test";
import { freshPhoneHome } from "./phone-helpers.js";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test("phone Spelling Bee renders the hex and rejects a too-short word", async ({ page }) => {
  await freshPhoneHome(page);
  await page.getByRole("button", { name: /Spelling Bee/ }).click();
  await expect(page.getByLabel(/Letter hex/)).toBeVisible({ timeout: 15_000 });
  const pills = page.getByLabel(/Letter hex/).getByRole("button", { name: /^Letter [A-Z]$/ });
  await expect(pills).toHaveCount(7);
  await page.screenshot({ path: "screenshots/phone-08-bee.png" });
  await pills.nth(1).click();
  await page.getByRole("button", { name: /^Submit$/ }).click();
  await expect(page.getByText(/Too short/)).toBeVisible();
});
