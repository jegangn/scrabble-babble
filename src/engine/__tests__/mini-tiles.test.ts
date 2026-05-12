import { describe, expect, it } from "vitest";
import { MINI_TILES, miniTileCount, miniVowelCount } from "../config/mini-tiles.js";
import { CLASSIC_TILES } from "../config/tiles.js";
import type { Letter } from "../types.js";

const ALL_LETTERS: ReadonlyArray<Letter> = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M",
  "N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
];

const VOWELS = new Set<Letter>(["A", "E", "I", "O", "U"]);

describe("MINI_TILES", () => {
  it("totals 60 tiles", () => {
    expect(miniTileCount()).toBe(60);
  });

  it("includes every letter at least once", () => {
    for (const letter of ALL_LETTERS) {
      const spec = MINI_TILES.find((t) => t.letter === letter);
      expect(spec, `missing ${letter}`).toBeDefined();
      expect(spec!.count).toBeGreaterThan(0);
    }
  });

  it("contains exactly one blank tile", () => {
    const blank = MINI_TILES.find((t) => t.letter === null);
    expect(blank?.count).toBe(1);
  });

  it("keeps vowel:total ratio within 5 percentage points of Classic", () => {
    const classicVowels = CLASSIC_TILES.filter(
      (t) => t.letter !== null && VOWELS.has(t.letter),
    ).reduce((a, s) => a + s.count, 0);
    const classicNonBlank = CLASSIC_TILES.filter((t) => t.letter !== null).reduce(
      (a, s) => a + s.count,
      0,
    );
    const classicRatio = classicVowels / classicNonBlank;

    const miniNonBlank = MINI_TILES.filter((t) => t.letter !== null).reduce(
      (a, s) => a + s.count,
      0,
    );
    const miniRatio = miniVowelCount() / miniNonBlank;

    expect(Math.abs(miniRatio - classicRatio)).toBeLessThan(0.05);
  });

  it("uses the same letter values as Classic (no new IP divergence)", () => {
    for (const letter of ALL_LETTERS) {
      const classicSpec = CLASSIC_TILES.find((t) => t.letter === letter)!;
      const miniSpec = MINI_TILES.find((t) => t.letter === letter)!;
      expect(miniSpec.value, `${letter} value`).toBe(classicSpec.value);
    }
  });
});
