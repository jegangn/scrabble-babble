import { describe, it } from "vitest";
import { MINI_BOARD } from "../config/mini-board.js";
import { verifySymmetric } from "./_helpers/symmetry-helper.js";

describe("MINI_BOARD", () => {
  it("matches the 11×11 4-fold-symmetric Mini invariants", () => {
    verifySymmetric(
      MINI_BOARD,
      { TW: 4, DW: 5, TL: 8, DL: 12, NONE: 121 - 29 },
      { centerPremium: "DW", cornerPremium: "TW" },
    );
  });
});
