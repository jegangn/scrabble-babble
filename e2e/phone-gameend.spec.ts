import { test, expect } from "@playwright/test";
import { freshPhoneHome } from "./phone-helpers.js";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test("phone game-end (via resign) shows result and on-screen actions", async ({ page }) => {
  await freshPhoneHome(page);
  await page.getByRole("button", { name: /New game/ }).click();
  await page.getByRole("button", { name: /Start game/ }).click(); // Mini default, hot-seat
  await expect(page.getByRole("button", { name: /^Submit/ })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /More options/ }).click();
  await page.getByRole("button", { name: /Resign game/ }).click();
  await page.getByRole("button", { name: /End game now/ }).click();
  const home = page.getByRole("button", { name: /Home/ });
  await expect(home).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: "screenshots/phone-05-gameend.png" });
  const box = await home.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(844); // actions within viewport
});
