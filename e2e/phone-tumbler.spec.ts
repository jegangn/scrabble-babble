import { test, expect } from "@playwright/test";
import { freshPhoneHome } from "./phone-helpers.js";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test("phone Tumbler renders 7 letters + timer and rejects too-short", async ({ page }) => {
  await freshPhoneHome(page);
  await page.getByRole("button", { name: /Tumbler/ }).click();
  await expect(page.getByRole("heading", { name: /^Tumbler$/ })).toBeVisible({ timeout: 10_000 });
  const pills = page.getByRole("button", { name: /^Letter [A-Z]$/ });
  await expect(pills).toHaveCount(7);
  await expect(page.getByText("Time", { exact: true })).toBeVisible();
  await expect(page.getByText("Score", { exact: true })).toBeVisible();
  await page.screenshot({ path: "screenshots/phone-06-tumbler.png" });
  await pills.nth(0).click();
  await page.getByRole("button", { name: /^Submit$/ }).click();
  await expect(page.getByText(/Need 2\+? letters|Too short/)).toBeVisible();
});
