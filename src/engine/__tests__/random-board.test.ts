import { describe, expect, it } from "vitest";
import { generateRandomBoard } from "../config/random-board.js";
import { createPrng } from "../prng.js";
import { verifySymmetric } from "./_helpers/symmetry-helper.js";

const EXPECTED_COUNTS = { TW: 8, DW: 9, TL: 16, DL: 24, NONE: 225 - 57 };

describe("generateRandomBoard", () => {
  it("produces a valid symmetric layout for each of 10 seeds", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const board = generateRandomBoard(createPrng(seed));
      verifySymmetric(board, EXPECTED_COUNTS, {
        centerPremium: "DW",
        cornerPremium: "TW",
      });
    }
  });

  it("never places TW orthogonally or diagonally adjacent to the centre", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { premiums } = generateRandomBoard(createPrng(seed));
      const c = 7;
      const neighbours = [
        [c - 1, c],
        [c + 1, c],
        [c, c - 1],
        [c, c + 1],
        [c - 1, c - 1],
        [c - 1, c + 1],
        [c + 1, c - 1],
        [c + 1, c + 1],
      ] as const;
      for (const [r, col] of neighbours) {
        expect(premiums[r]![col]).not.toBe("TW");
      }
    }
  });

  it("different seeds produce different layouts", () => {
    const a = generateRandomBoard(createPrng(1));
    const b = generateRandomBoard(createPrng(2));
    expect(JSON.stringify(a.premiums)).not.toBe(JSON.stringify(b.premiums));
  });

  it("the same seed reproduces the same layout", () => {
    const a = generateRandomBoard(createPrng(42));
    const b = generateRandomBoard(createPrng(42));
    expect(a.premiums).toEqual(b.premiums);
  });
});
