import { describe, expect, it } from "vitest";
import { CLASSIC_BOARD } from "../config/board.js";
import type { PremiumType } from "../types.js";

const { size, premiums } = CLASSIC_BOARD;

function premiumAt(r: number, c: number): PremiumType {
  return premiums[r]![c]!;
}

describe("CLASSIC_BOARD", () => {
  it("is 15×15", () => {
    expect(size).toBe(15);
    expect(premiums).toHaveLength(15);
    for (const row of premiums) expect(row).toHaveLength(15);
  });

  it("center cell (7,7) is DW", () => {
    expect(premiumAt(7, 7)).toBe("DW");
  });

  it("has 4-fold rotational symmetry", () => {
    // Each cell (r,c) must equal the cell at (c, size-1-r).
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const rotated = premiumAt(c, size - 1 - r);
        expect(rotated).toBe(premiumAt(r, c));
      }
    }
  });

  it("has the required premium counts", () => {
    const counts: Record<PremiumType, number> = {
      NONE: 0,
      DL: 0,
      TL: 0,
      DW: 0,
      TW: 0,
    };
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        counts[premiumAt(r, c)]++;
      }
    }
    expect(counts.TW).toBe(8);
    expect(counts.DW).toBe(9);
    expect(counts.TL).toBe(16);
    expect(counts.DL).toBe(24);
    expect(counts.NONE).toBe(225 - 57);
  });

  it("has 57 premium cells total", () => {
    let premium = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (premiumAt(r, c) !== "NONE") premium++;
      }
    }
    expect(premium).toBe(57);
  });

  it("has TW at all four corners", () => {
    expect(premiumAt(0, 0)).toBe("TW");
    expect(premiumAt(0, 14)).toBe("TW");
    expect(premiumAt(14, 0)).toBe("TW");
    expect(premiumAt(14, 14)).toBe("TW");
  });
});
