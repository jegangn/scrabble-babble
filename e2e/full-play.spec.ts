import { test, expect, Page } from "@playwright/test";

/**
 * End-to-end happy-path tests. Each one actually plays through a mode
 * and verifies user-visible state changes — not just that screens render.
 *
 * Coverage:
 *   - Tumbler: type a valid word → it lists → duplicate rejected; round-end
 *     reveals the "All possible words" card
 *   - Spelling Bee: tap a valid word → submit clears it; Clear empties; Shuffle
 *   - Classic vs Computer: pass move → AI takes its turn → turn alternates
 *   - Cross-mode resume: start a game, reload, Resume appears
 *
 * Run with: npx playwright test e2e/full-play.spec.ts --reporter=list
 * (The preview server is auto-spawned by playwright.config.ts via npm.)
 */

const HOME_URL = "/";

// All valid 2-letter Scrabble words (also valid in CSW21). With a random
// 7-letter Tumbler draw, statistically >99% of draws contain at least one.
const TWO_LETTER_WORDS: ReadonlyArray<string> = [
  "AA","AB","AD","AE","AG","AH","AI","AL","AM","AN","AR","AS","AT","AW","AX","AY",
  "BA","BE","BI","BO","BY",
  "DA","DE","DO",
  "ED","EF","EH","EL","EM","EN","ER","ES","ET","EX",
  "FA","FE",
  "GO",
  "HA","HE","HI","HM","HO",
  "ID","IF","IN","IS","IT",
  "JO",
  "KA","KI",
  "LA","LI","LO",
  "MA","ME","MI","MM","MO","MU","MY",
  "NA","NE","NO","NU",
  "OD","OE","OF","OH","OI","OM","ON","OP","OR","OS","OW","OX","OY",
  "PA","PE","PI",
  "QI",
  "RE",
  "SH","SI","SO",
  "TA","TI","TO",
  "UH","UM","UN","UP","US","UT",
  "WE","WO",
  "XI","XU",
  "YA","YE","YO",
  "ZA",
];

function multisetSubset(pool: string[], needed: string[]): boolean {
  const counts = new Map<string, number>();
  for (const l of pool) counts.set(l, (counts.get(l) ?? 0) + 1);
  for (const l of needed) {
    const c = counts.get(l) ?? 0;
    if (c === 0) return false;
    counts.set(l, c - 1);
  }
  return true;
}

/** Find a 2-letter word formable from the rack. Returns null if none. */
function findValidTwoLetterWord(rack: string[]): string | null {
  for (const w of TWO_LETTER_WORDS) {
    if (multisetSubset(rack, Array.from(w))) return w;
  }
  return null;
}

/** Read the rack letters from the Tumbler pill aria-labels ("Letter X"). */
async function readRack(page: Page): Promise<string[]> {
  const pills = page.getByRole("button", { name: /^Letter [A-Z]$/ });
  await expect(pills).toHaveCount(7);
  const rack: string[] = [];
  for (let i = 0; i < 7; i++) {
    const label = (await pills.nth(i).getAttribute("aria-label")) ?? "";
    rack.push(label.replace("Letter ", "").trim());
  }
  return rack;
}

/** Map a word back to specific rack-pill indices, consuming each slot once. */
function indicesForWord(rack: string[], word: string): number[] {
  const used = new Set<number>();
  const out: number[] = [];
  for (const ch of word) {
    const idx = rack.findIndex((l, i) => l === ch && !used.has(i));
    if (idx < 0) return [];
    used.add(idx);
    out.push(idx);
  }
  return out;
}

async function freshHome(page: Page): Promise<void> {
  await page.goto(HOME_URL);
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("scrabble-babble");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
    // Pre-seed current_user so the welcome name-prompt doesn't block tests.
    // Create ALL stores at v1 (see smoke.spec for rationale).
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
  await expect(page.getByRole("heading", { name: /Scrabble Babble/ })).toBeVisible({
    timeout: 10_000,
  });
}

test.describe("Tumbler full play-through", () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
  });

  test("submits a valid word, lists it, rejects duplicate + invalid", async ({ page }) => {
    await page.getByRole("button", { name: /Tumbler/ }).click();
    const pills = page.getByRole("button", { name: /^Letter [A-Z]$/ });
    await expect(pills).toHaveCount(7);
    const rack = await readRack(page);

    const valid = findValidTwoLetterWord(rack);
    test.skip(valid === null, `Unlucky draw ${rack.join("")} had no 2-letter word; rerun.`);

    const idx = indicesForWord(rack, valid!);
    expect(idx.length).toBe(valid!.length);

    const submit = page.getByRole("button", { name: /^Submit$/ });

    // Compose + submit the valid word → it lands in "Found this round".
    for (const i of idx) await pills.nth(i).click();
    await submit.click();
    await expect(page.getByText(/Found this round/)).toBeVisible();
    await expect(page.getByText(valid!, { exact: true }).first()).toBeVisible();

    // Submit the SAME word again → "already found".
    for (const i of idx) await pills.nth(i).click();
    await submit.click();
    await expect(page.getByText(/already found/i)).toBeVisible();

    // Tap the same pill twice + a different one → rejected.
    await pills.nth(0).click();
    await pills.nth(0).click();
    await pills.nth(1).click();
    await submit.click();
    await expect(page.getByText(/Not a word|Not in rack|already found/i)).toBeVisible();
  });

  test("round end reveals the 'All possible words' card", async ({ page }) => {
    await page.clock.install();
    await page.getByRole("button", { name: /Tumbler/ }).click();
    const pills = page.getByRole("button", { name: /^Letter [A-Z]$/ });
    await expect(pills).toHaveCount(7);

    // Tapping a letter starts the 60s timer; fast-forward past it.
    await pills.nth(0).click();
    await page.clock.fastForward(61_000);

    await expect(page.getByText(/Round complete/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/All possible words/i)).toBeVisible();
  });
});

test.describe("Spelling Bee full play-through", () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
  });

  test("composes a word by tapping letters and submits", async ({ page }) => {
    await page.getByRole("button", { name: /Spelling Bee/ }).click();
    await expect(page.getByLabel(/Letter hex/)).toBeVisible({ timeout: 15_000 });

    const hexPills = page.getByLabel(/Letter hex/).getByRole("button", { name: /^Letter [A-Z]$/ });
    await expect(hexPills).toHaveCount(7);

    // Tap centre + 3 outer letters to compose a 4-letter sequence (may or may
    // not be a real word — either way the UI must respond and then clear).
    for (let i = 0; i < 4; i++) await hexPills.nth(i).click();

    const currentWord = page.locator('[aria-label^="Current word"]');
    await expect(currentWord).toHaveAttribute("aria-label", /^Current word: [A-Z]{4}$/);

    await page.getByRole("button", { name: /^Submit$/ }).click();
    // After submit the strip clears back to the empty placeholder.
    await expect(currentWord).toHaveAttribute("aria-label", "Current word");
  });

  test("Clear empties the in-progress word", async ({ page }) => {
    await page.getByRole("button", { name: /Spelling Bee/ }).click();
    await expect(page.getByLabel(/Letter hex/)).toBeVisible({ timeout: 15_000 });

    const hexPills = page.getByLabel(/Letter hex/).getByRole("button", { name: /^Letter [A-Z]$/ });
    await hexPills.nth(0).click();
    await hexPills.nth(1).click();

    const currentWord = page.locator('[aria-label^="Current word"]');
    await expect(currentWord).toHaveAttribute("aria-label", /^Current word: [A-Z]{2}$/);

    await page.getByRole("button", { name: /Clear/ }).click();
    await expect(currentWord).toHaveAttribute("aria-label", "Current word");
  });

  test("Shuffle reorders outer letters without changing the set", async ({ page }) => {
    await page.getByRole("button", { name: /Spelling Bee/ }).click();
    await expect(page.getByLabel(/Letter hex/)).toBeVisible({ timeout: 15_000 });

    const hexPills = page.getByLabel(/Letter hex/).getByRole("button", { name: /^Letter [A-Z]$/ });
    const read = async (): Promise<string[]> => {
      const out: string[] = [];
      for (let i = 0; i < 7; i++) {
        const label = (await hexPills.nth(i).getAttribute("aria-label")) ?? "";
        out.push(label.replace("Letter ", "").trim());
      }
      return out;
    };
    const before = await read();
    await page.getByRole("button", { name: /Shuffle/ }).click();
    const after = await read();

    expect([...after].sort()).toEqual([...before].sort()); // same set
    expect(after).not.toEqual(before); // different order
  });
});

test.describe("Classic vs Computer", () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
  });

  test("pass move triggers the AI to take its turn (turn alternates)", async ({ page }) => {
    await page.getByRole("button", { name: /New game/ }).click();
    // Opponent is a Segmented control (buttons, not radios) — pick Computer.
    await page.getByRole("button", { name: /^Computer$/ }).click();
    // Difficulty defaults to Easygoing; leave alone.
    await page.getByRole("button", { name: /Start game/ }).click();

    // Game started (AI mode) — the action bar is live.
    await expect(page.getByRole("button", { name: /^Pass$/ })).toBeVisible();

    // Human plays first — press Pass, then confirm in the dialog.
    await page.getByRole("button", { name: /^Pass$/ }).click();
    await page.getByRole("button", { name: /^Pass turn$/ }).click();

    // The thinking chip appears, then resolves within the bot's budget.
    const thinking = page.getByText(/Computer is thinking/);
    await expect(thinking).toBeHidden({ timeout: 10_000 });

    // Back to human's turn — the Pass button is interactive again.
    await expect(page.getByRole("button", { name: /^Pass$/ })).toBeEnabled({ timeout: 5_000 });
  });
});

test.describe("Cross-mode resume", () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
  });

  test("starting a Classic game then reloading shows Resume on home", async ({ page }) => {
    await page.getByRole("button", { name: /New game/ }).click();
    await page.getByRole("button", { name: /Start game/ }).click();
    await expect(page.getByRole("button", { name: /^Pass$/ })).toBeVisible();

    // Reload — Home should now show the Resume button.
    await page.goto(HOME_URL);
    await expect(page.getByRole("button", { name: /Resume game/ })).toBeVisible({
      timeout: 10_000,
    });
  });
});
