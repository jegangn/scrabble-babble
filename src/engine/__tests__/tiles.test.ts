import { describe, expect, it } from "vitest";
import { CLASSIC_TILES, letterValue } from "../config/tiles.js";
import { BINGO_BONUS, DEFAULT_RULES, RACK_SIZE } from "../config/rules.js";

describe("CLASSIC_TILES distribution", () => {
  it("sums to 104 tiles", () => {
    const total = CLASSIC_TILES.reduce((sum, t) => sum + t.count, 0);
    expect(total).toBe(104);
  });

  it("contains exactly 2 blanks at value 0", () => {
    const blanks = CLASSIC_TILES.filter((t) => t.letter === null);
    expect(blanks).toHaveLength(1);
    expect(blanks[0]!.count).toBe(2);
    expect(blanks[0]!.value).toBe(0);
  });

  it("contains 13 E tiles at value 1", () => {
    const e = CLASSIC_TILES.find((t) => t.letter === "E");
    expect(e?.count).toBe(13);
    expect(e?.value).toBe(1);
  });

  it("covers all 26 letters", () => {
    const letters = new Set(CLASSIC_TILES.map((t) => t.letter).filter((l) => l !== null));
    expect(letters.size).toBe(26);
  });

  it("never has a count or value below zero", () => {
    for (const spec of CLASSIC_TILES) {
      expect(spec.count).toBeGreaterThanOrEqual(0);
      expect(spec.value).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("letterValue", () => {
  it("returns 1 for E", () => {
    expect(letterValue("E")).toBe(1);
  });

  it("returns 10 for Z", () => {
    expect(letterValue("Z")).toBe(10);
  });
});

describe("DEFAULT_RULES", () => {
  it("uses bingo bonus of 35", () => {
    expect(DEFAULT_RULES.bingoBonus).toBe(BINGO_BONUS);
    expect(DEFAULT_RULES.bingoBonus).toBe(35);
  });

  it("uses rack size of 7", () => {
    expect(DEFAULT_RULES.rackSize).toBe(RACK_SIZE);
    expect(DEFAULT_RULES.rackSize).toBe(7);
  });

  it("ends after 4 consecutive passes", () => {
    expect(DEFAULT_RULES.maxConsecutivePasses).toBe(4);
  });

  it("requires at least 1 tile in bag to swap", () => {
    expect(DEFAULT_RULES.minBagToSwap).toBe(1);
  });
});
