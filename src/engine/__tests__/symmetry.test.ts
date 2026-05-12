import { describe, it } from "vitest";
import { CLASSIC_BOARD } from "../config/board.js";
import { verifySymmetric } from "./_helpers/symmetry-helper.js";

describe("CLASSIC_BOARD", () => {
  it("matches the 15×15 4-fold-symmetric Classic invariants", () => {
    verifySymmetric(
      CLASSIC_BOARD,
      { TW: 8, DW: 9, TL: 16, DL: 24, NONE: 225 - 57 },
      { centerPremium: "DW", cornerPremium: "TW" },
    );
  });
});
