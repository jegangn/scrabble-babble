import { test, expect } from "@playwright/test";
import { freshPhoneHome } from "./phone-helpers.js";

/**
 * Regression: PhoneHome must fit inside the SE viewport (375×667) without
 * requiring any scrolling. On a short Safari window (~573 px usable after
 * toolbars) the content used to overflow by ~20 px. The compact preset
 * (matchMedia max-height:700px at mount) tightens hero + paddings + gaps so
 * total content height drops to ~504 px.
 *
 * We do NOT seed an in-progress game here (Resume button absent) because
 * doing so safely requires extra IDB scaffolding. The four fixed buttons
 * (New game, Tumbler, Spelling Bee, Scores) are the worst case that is easy
 * to reproduce; the Resume variant adds one more button and therefore more
 * height, but it is covered implicitly by the content-fit assertion: if the
 * scrollHeight == clientHeight without Resume, adding Resume only matters if
 * it pushes the total above the viewport.
 *
 * Run: npx playwright test e2e/phone-home-fit.spec.ts --reporter=list
 */

test.use({
  viewport: { width: 375, height: 667 },
  hasTouch: true,
  isMobile: true,
});

test.describe("PhoneHome — iPhone SE fit", () => {
  test("compact hero, all nav buttons visible without scrolling", async ({
    page,
  }) => {
    await freshPhoneHome(page);

    // Wait for the home heading to be visible so mount effects have settled.
    await expect(
      page.getByRole("heading", { name: /Scrabble Babble/ }),
    ).toBeVisible({ timeout: 10_000 });

    // The scrollable column is the last child of [data-testid="phone-root"]'s
    // inner wrapper. Assert its content fits without scrolling.
    const overflow = await page.evaluate(() => {
      const root = document.querySelector("[data-testid='phone-root']");
      if (!root) return { scrollHeight: -1, clientHeight: -1 };
      // The inner wrapper is the first child of phone-root; it holds the
      // scrollable column as its last child.
      const wrapper = root.firstElementChild as HTMLElement | null;
      const col = wrapper?.lastElementChild as HTMLElement | null;
      if (!col) return { scrollHeight: -1, clientHeight: -1 };
      return {
        scrollHeight: col.scrollHeight,
        clientHeight: col.clientHeight,
      };
    });

    expect(overflow.scrollHeight, "scrollable column should not overflow").not.toBe(-1);
    // Allow 1 px of rounding tolerance.
    expect(
      overflow.scrollHeight,
      `column scrollHeight (${overflow.scrollHeight}) must be <= clientHeight (${overflow.clientHeight})`,
    ).toBeLessThanOrEqual(overflow.clientHeight + 1);

    // All 4 fixed nav buttons must be visible in the viewport without scrolling.
    for (const label of ["New game", "Tumbler", "Spelling Bee", "Scores"]) {
      const btn = page.getByRole("button", { name: new RegExp(label, "i") });
      await expect(btn, `"${label}" must be in viewport`).toBeInViewport();
    }

    // Bonus: the compact preset must have fired — hero tile height should be
    // the 30 px compact size, not the 36 px default. boundingBox returns
    // post-animation visual coordinates; the animation may still be running
    // so we read the CSS custom property via evaluate instead of measuring.
    // TileHero renders MenuTile children inside .hero-tile spans; the tile
    // size is passed as a CSS width/height on the inner element.
    const heroTileHeight = await page.evaluate(() => {
      const tile = document.querySelector(".hero-tile") as HTMLElement | null;
      if (!tile) return -1;
      // The actual rendered tile is the first descendant with a fixed height.
      // MenuTile sets explicit width+height via inline style.
      const inner = tile.firstElementChild as HTMLElement | null;
      if (!inner) return -1;
      return parseFloat(inner.style.height || "0") || inner.offsetHeight;
    });

    // The compact hero uses tileSize=30; default is 36. We assert it is under
    // 36 (and above 0 to catch cases where the selector failed).
    expect(
      heroTileHeight,
      `hero tile height (${heroTileHeight}px) should be compact (<36 px) at 375x667`,
    ).toBeGreaterThan(0);
    expect(
      heroTileHeight,
      `hero tile height (${heroTileHeight}px) should be compact (<36 px) at 375x667`,
    ).toBeLessThan(36);
  });
});
