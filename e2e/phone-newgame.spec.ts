import { test, expect } from "@playwright/test";
import { freshPhoneHome } from "./phone-helpers.js";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test("phone New Game opens with Mini pre-selected", async ({ page }) => {
  await freshPhoneHome(page);
  await page.getByRole("button", { name: /New game/ }).click();
  await expect(page.getByRole("heading", { name: /New game/ })).toBeVisible({ timeout: 10_000 });
  // Mini is the phone default — assert via BoardOption's selected-state signal.
  // BoardOption exposes aria-pressed={selected} on its button element.
  await expect(page.getByRole("button", { name: /Mini/ })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "screenshots/phone-02-newgame.png" });
});
