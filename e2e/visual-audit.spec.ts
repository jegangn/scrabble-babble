/**
 * Visual audit: walk every screen at iPad and Tab-S8 landscape viewports
 * and screenshot. The assertions are minimal — these are reviewed visually,
 * not by pixel diff. Goal: catch overlap, clipping, misaligned controls,
 * touch targets too close together, and so on.
 *
 * Tests run against the preview server (webServer in playwright.config.ts).
 */
import { test, expect, type Page } from "@playwright/test";
import { promises as fs } from "node:fs";
import * as path from "node:path";

const OUT = "screenshots/visual-audit";

const VIEWPORTS = {
  // iPad Pro 11" landscape (the original target)
  ipad: { width: 1180, height: 820 },
  // Galaxy Tab S8 landscape — effective CSS pixels at default zoom (~1340×800)
  tabS8: { width: 1340, height: 800 },
} as const;

async function shot(page: Page, name: string, viewport: keyof typeof VIEWPORTS) {
  const dir = path.join(OUT, viewport);
  await fs.mkdir(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `${name}.png`),
    fullPage: false,
  });
}

interface OverlapReport {
  readonly a: string;
  readonly b: string;
  readonly overlap: { readonly w: number; readonly h: number };
}

/**
 * Programmatic overlap detector — runs in the page context, scans every
 * interactive element (button / a / input), and reports pairs whose
 * bounding rects intersect by more than 4 px on each axis.
 *
 * Excludes element pairs where one is an ancestor of the other (a button
 * "overlapping" its own inner span is not a layout bug). Also excludes
 * fixed-position chrome (BackPill / UserChip) overlapping content beneath
 * them since they're intentionally layered.
 */
async function detectOverlaps(page: Page): Promise<OverlapReport[]> {
  return page.evaluate(() => {
    const tag = (el: Element): string => {
      const role = el.getAttribute("role");
      const label = el.getAttribute("aria-label");
      const text = (el.textContent ?? "").trim().slice(0, 32);
      return `<${el.tagName.toLowerCase()}${role ? ` role="${role}"` : ""}${label ? ` aria="${label}"` : ""}> "${text}"`;
    };
    const isFixed = (el: Element): boolean => {
      const pos = getComputedStyle(el as HTMLElement).position;
      return pos === "fixed" || pos === "absolute";
    };
    const isAncestor = (a: Element, b: Element): boolean =>
      a.contains(b) || b.contains(a);
    const isVisible = (el: Element): boolean => {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return false;
      const style = getComputedStyle(el as HTMLElement);
      return style.visibility !== "hidden" && style.display !== "none";
    };
    const items = Array.from(
      document.querySelectorAll<HTMLElement>(
        "button, a, [role='button'], input:not([type='hidden'])",
      ),
    ).filter(isVisible);

    const reports: OverlapReport[] = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]!;
        const b = items[j]!;
        if (isAncestor(a, b)) continue;
        // Both fixed/absolute — almost always intentional layering (chip
        // over content, modal over backdrop, etc.). Skip these pairs.
        if (isFixed(a) && isFixed(b)) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const overlapW = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const overlapH = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (overlapW > 4 && overlapH > 4) {
          reports.push({
            a: tag(a),
            b: tag(b),
            overlap: { w: Math.round(overlapW), h: Math.round(overlapH) },
          });
        }
      }
    }
    return reports;
  });
}

/**
 * Soft-assert: log overlaps but don't fail the test. We use this so the
 * audit run produces a complete catalogue of issues across every screen
 * + viewport instead of bailing on the first one.
 */
async function reportOverlaps(page: Page, label: string): Promise<void> {
  const overlaps = await detectOverlaps(page);
  if (overlaps.length === 0) return;
  // eslint-disable-next-line no-console
  console.log(`\n[overlap] ${label} (${overlaps.length} pair${overlaps.length === 1 ? "" : "s"}):`);
  for (const o of overlaps) {
    // eslint-disable-next-line no-console
    console.log(`  ${o.overlap.w}×${o.overlap.h}px  ${o.a}  ↔  ${o.b}`);
  }
}

async function gotoHome(page: Page) {
  await page.goto("/");
  // Pre-seed current_user so the welcome name-prompt doesn't block screen
  // captures. Create ALL stores at v1 (see smoke.spec for rationale).
  await page.evaluate(async () => {
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
  await expect(page.getByRole("button", { name: /^new game$/i })).toBeVisible({
    timeout: 20_000,
  });
}

for (const [vpName, vp] of Object.entries(VIEWPORTS) as Array<
  [keyof typeof VIEWPORTS, (typeof VIEWPORTS)[keyof typeof VIEWPORTS]]
>) {
  test.describe(`visual audit @ ${vpName} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: vp });

    test("Home", async ({ page }) => {
      await gotoHome(page);
      await shot(page, "01-home", vpName);
      await reportOverlaps(page, `${vpName} · Home`);
    });

    test("NewGame — default (Classic + hot-seat)", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^new game$/i }).click();
      await expect(page.getByText(/opponent/i).first()).toBeVisible({ timeout: 5000 });
      await shot(page, "02-new-game-default", vpName);
      await reportOverlaps(page, `${vpName} · NewGame default`);
    });

    test("NewGame — Mini + AI Easygoing", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^new game$/i }).click();
      // Opponent: tap the "Computer" segment (new Segmented control —
      // aria-pressed buttons, not radio inputs).
      await page.getByRole("button", { name: /^computer$/i }).click();
      // Board: tap the "Mini" board option card. The new BoardOption
      // is a button, not a checked radio.
      await page.getByRole("button", { name: /mini.*11/i }).click();
      // After picking AI, the difficulty fieldset becomes visible with
      // the 5-tier star-rating cards.
      await expect(page.getByText(/difficulty/i).first()).toBeVisible();
      await shot(page, "03-new-game-mini-ai", vpName);
      await reportOverlaps(page, `${vpName} · NewGame mini AI`);
    });

    test("Game — Classic, hot-seat", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^new game$/i }).click();
      await page.getByRole("button", { name: /^start game$/i }).click();
      // Board rendered when the centre ★ appears.
      await expect(page.getByText("★").first()).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(500);
      await shot(page, "04-game-classic", vpName);
      await reportOverlaps(page, `${vpName} · Game classic`);
    });

    test("Game — Mini, hot-seat", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^new game$/i }).click();
      await page.getByRole("button", { name: /mini.*11/i }).click();
      await page.getByRole("button", { name: /^start game$/i }).click();
      await expect(page.getByText("★").first()).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(500);
      await shot(page, "05-game-mini", vpName);
      await reportOverlaps(page, `${vpName} · Game mini`);
    });

    test("Tumbler", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /tumbler/i }).click();
      // Header h1 confirms the screen is mounted.
      await expect(page.getByRole("heading", { name: /^tumbler$/i })).toBeVisible({
        timeout: 10_000,
      });
      await page.waitForTimeout(300);
      await shot(page, "06-tumbler-start", vpName);
      await reportOverlaps(page, `${vpName} · Tumbler start`);

      // Tap-only mode — tap two rack pills to show the in-progress word.
      const pills = page.getByRole("button", { name: /^Letter [A-Z]$/ });
      await pills.nth(0).click();
      await pills.nth(1).click();
      await shot(page, "06b-tumbler-typed", vpName);
      await reportOverlaps(page, `${vpName} · Tumbler typing`);
    });

    test("Spelling Bee", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /spelling bee/i }).click();
      await expect(page.getByLabel(/letter hex/i)).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(800); // let total-words enumerator settle
      await shot(page, "07-bee-start", vpName);
      await reportOverlaps(page, `${vpName} · Bee start`);

      // Tap centre + a couple outer letters to show in-progress word.
      const pills = await page.locator("[aria-label='Letter hex'] [role='button']").all();
      for (let i = 0; i < Math.min(4, pills.length); i++) {
        await pills[i]!.click();
      }
      await shot(page, "07b-bee-typing", vpName);
      await reportOverlaps(page, `${vpName} · Bee typing`);
    });

    test("Spelling Bee slide trail visible during drag", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /spelling bee/i }).click();
      const hex = page.getByLabel(/letter hex/i);
      await expect(hex).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(400);

      const box = await hex.boundingBox();
      expect(box).not.toBeNull();
      if (!box) return;

      // Slow drag across the hex: press the upper-left area, slide
      // through the centre, finish at the lower-right. The polyline
      // overlay should be visibly drawn under the finger while we hold.
      const start = { x: box.x + 70, y: box.y + 110 };
      const end = { x: box.x + 240, y: box.y + 210 };
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x + 30, start.y + 20, { steps: 4 });
      await page.mouse.move(end.x, end.y, { steps: 12 });
      // Capture while the trail is visible (still holding pointer down).
      await shot(page, "07c-bee-slide-trail", vpName);
      await page.mouse.up();
    });

    test("Resign confirm modal + GameEnd screen", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^new game$/i }).click();
      await page.getByRole("button", { name: /^start game$/i }).click();
      // Open Resign confirmation.
      await page.getByRole("button", { name: /^resign$/i }).click();
      // New modal copy: "End the game?" + "Your opponent will take the win."
      await expect(page.getByText(/your opponent will take the win/i)).toBeVisible();
      // Animation budget: modal fades in (200 ms) + rises (280 ms).
      // Wait for both to settle so the screenshot captures the full panel.
      await page.waitForTimeout(350);
      await shot(page, "08-resign-modal", vpName);
      await reportOverlaps(page, `${vpName} · Resign modal`);

      // Confirm — destructive button is "End game now".
      await page.getByRole("button", { name: /end game now/i }).click();
      // GameEnd renders "{Name} wins." or "It's a tie." in a display-size heading.
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(300);
      await shot(page, "09-game-end", vpName);
      await reportOverlaps(page, `${vpName} · GameEnd`);
    });

    test("Swap modal opens with rack tiles", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^new game$/i }).click();
      await page.getByRole("button", { name: /^start game$/i }).click();
      await expect(page.getByText("★").first()).toBeVisible({ timeout: 10_000 });
      // Swap button — icon + label "Swap" — matches a partial regex.
      const swapBtn = page.getByRole("button", { name: /swap/i }).first();
      await expect(swapBtn).toBeEnabled();
      await swapBtn.click();
      // ModalFrame title is "Swap tiles"; should be visible.
      await expect(page.getByRole("heading", { name: /swap tiles/i })).toBeVisible();
      // Animation budget: see Resign modal note above.
      await page.waitForTimeout(350);
      await shot(page, "10-swap-modal", vpName);
      await reportOverlaps(page, `${vpName} · Swap modal`);
    });

    test("Drag overlay shows a moving tile (no disappearing)", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^new game$/i }).click();
      await page.getByRole("button", { name: /^start game$/i }).click();
      await expect(page.getByText("★").first()).toBeVisible({ timeout: 10_000 });

      // Find a rack tile (DraggableRackTile renders a <div role="button">
      // around a <Tile> with the letter).
      const firstRackTile = page.locator('[role="button"][tabindex="0"]').first();
      const box = await firstRackTile.boundingBox();
      expect(box).not.toBeNull();
      if (!box) return;

      // Begin a slow drag — the DragOverlay tile should appear in the DOM
      // (a child of the body, outside the React tree). Hold partway through
      // so we can screenshot the in-flight state.
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      // Multi-step move triggers @dnd-kit's pointer-activation distance and
      // mounts the DragOverlay portal at body level.
      await page.mouse.move(startX + 40, startY + 40, { steps: 6 });
      await page.mouse.move(startX + 120, startY + 80, { steps: 8 });

      // While the drag is in flight, screenshot to verify a moving tile
      // is visibly present (not just an empty rack slot).
      await shot(page, "12-drag-in-flight", vpName);
      await page.mouse.up();
    });

    test("HotSeatHandoff after passing in hot-seat", async ({ page }) => {
      await gotoHome(page);
      await page.getByRole("button", { name: /^new game$/i }).click();
      await page.getByRole("button", { name: /^start game$/i }).click();
      await expect(page.getByText("★").first()).toBeVisible({ timeout: 10_000 });
      // Pass — flips turn → hot-seat handoff overlay appears.
      await page.getByRole("button", { name: /^pass$/i }).click();
      // Handoff overlay shows "Pass the iPad to <name>" + "I'm <name> — ready".
      await expect(page.getByText(/pass the ipad to/i)).toBeVisible({ timeout: 5000 });
      const readyBtn = page.getByRole("button", { name: /ready/i });
      await expect(readyBtn).toBeVisible();
      await page.waitForTimeout(200);
      await shot(page, "11-handoff", vpName);
      // Tap "I'm {name} — ready" to return to the game.
      await readyBtn.click();
      await expect(page.getByText("★").first()).toBeVisible();
      await reportOverlaps(page, `${vpName} · Handoff`);
    });
  });
}
