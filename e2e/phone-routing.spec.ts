import { test, expect } from "@playwright/test";
import { freshPhoneHome } from "./phone-helpers.js";

test.describe("DeviceRouter — phone portrait routes to PhoneApp", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("iPhone portrait shows the phone tree", async ({ page }) => {
    await freshPhoneHome(page);
    await expect(page.getByTestId("phone-root")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("DeviceRouter — desktop/tablet keeps the existing tree", () => {
  // Default config viewport (1180x820, no touch) → desktop path.
  test("no phone tree on the iPad/desktop viewport", async ({ page }) => {
    await freshPhoneHome(page);
    await expect(page.getByRole("heading", { name: /Scrabble Babble/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("phone-root")).toHaveCount(0);
  });
});
