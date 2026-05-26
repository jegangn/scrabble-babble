import { expect, test, type Page } from "@playwright/test";

/** Seed a Tumbler leaderboard row in IndexedDB. Mirrors the pattern in
 *  e2e/phone-helpers.ts:freshPhoneHome — wipe the DB, recreate the
 *  schema, seed rows, reload. Runs in page context so the app's own DB
 *  open (which happens after reload) sees our seeded rows. */
async function seedAndReload(page: Page, currentUser: string): Promise<void> {
  await page.goto("/");
  await page.evaluate(async (user) => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("scrabble-babble");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("scrabble-babble", 1);
      open.onupgradeneeded = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains("in_progress")) db.createObjectStore("in_progress");
        if (!db.objectStoreNames.contains("history")) db.createObjectStore("history", { keyPath: "id" });
        if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
      };
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction("settings", "readwrite");
        tx.objectStore("settings").put({ key: "current_user", value: user });
        tx.objectStore("settings").put({
          key: "leaderboard_tumbler",
          value: [
            { name: user, score: 247, timestamp: new Date(2026, 4, 26).getTime() },
            { name: "Father", score: 198, timestamp: new Date(2026, 4, 25).getTime() },
          ],
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      open.onerror = () => reject(open.error);
    });
  }, currentUser);
  await page.reload();
}

test.describe("BestScoresCard — Tumbler in-game (big screen)", () => {
  test.use({ viewport: { width: 1366, height: 880 } });

  test("shows the device-wide best collapsed; expands on tap; highlights current user", async ({ page }) => {
    await seedAndReload(page, "Tester");
    await page.getByRole("button", { name: /Tumbler/ }).click();
    await expect(page.getByRole("heading", { name: /^Tumbler$/ })).toBeVisible({ timeout: 10_000 });

    // Collapsed header — clickable "Show top scores" with #1 score visible.
    const header = page.getByRole("button", { name: /show top scores/i });
    await expect(header).toBeVisible();
    await expect(header).toContainText("247");

    // Date NOT visible while collapsed.
    await expect(page.getByText("26/05/2026")).not.toBeVisible();

    // Tap to expand.
    await header.click();

    // Both entries + dates visible.
    await expect(page.getByText("Tester").first()).toBeVisible();
    await expect(page.getByText("Father").first()).toBeVisible();
    await expect(page.getByText("26/05/2026")).toBeVisible();
    await expect(page.getByText("25/05/2026")).toBeVisible();

    // Tap again to collapse.
    await page.getByRole("button", { name: /hide top scores/i }).click();
    await expect(page.getByText("26/05/2026")).not.toBeVisible();
  });
});

test.describe("BestScoresCard — Phone Tumbler", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("renders on phone Tumbler — same collapsed/expanded contract", async ({ page }) => {
    await seedAndReload(page, "Tester");
    await page.getByRole("button", { name: /Tumbler/ }).click();
    await expect(page.getByRole("heading", { name: /^Tumbler$/ })).toBeVisible({ timeout: 10_000 });

    const header = page.getByRole("button", { name: /show top scores/i });
    await expect(header).toBeVisible();
    await expect(header).toContainText("247");
    await header.click();
    await expect(page.getByText("26/05/2026")).toBeVisible();
  });
});

test.describe("BestScoresCard — empty state", () => {
  test.use({ viewport: { width: 1366, height: 880 } });

  test("renders 'Best · —' with toggle disabled when no entries exist", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase("scrabble-babble");
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("scrabble-babble", 1);
        open.onupgradeneeded = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains("in_progress")) db.createObjectStore("in_progress");
          if (!db.objectStoreNames.contains("history")) db.createObjectStore("history", { keyPath: "id" });
          if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
        };
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("settings", "readwrite");
          tx.objectStore("settings").put({ key: "current_user", value: "Tester" });
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
        open.onerror = () => reject(open.error);
      });
    });
    await page.reload();
    await page.getByRole("button", { name: /Tumbler/ }).click();
    await expect(page.getByRole("heading", { name: /^Tumbler$/ })).toBeVisible({ timeout: 10_000 });

    const noScores = page.getByRole("button", { name: /no scores yet/i });
    await expect(noScores).toBeVisible();
    await expect(noScores).toBeDisabled();
    await expect(noScores).toContainText("—");
  });
});
