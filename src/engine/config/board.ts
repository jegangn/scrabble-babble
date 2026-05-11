import type { BoardConfig, PremiumType } from "../types.js";

/**
 * Classic 15×15 premium layout.
 *
 * 4-fold rotationally symmetric. 57 premium cells total:
 * 8 TW, 9 DW (incl. center starting star), 16 TL, 24 DL.
 *
 * Layout source: `docs/IP_DIVERGENCES.md`. Symmetry and counts are verified
 * by `__tests__/symmetry.test.ts`.
 *
 * Char map: T=TW, D=DW, L=TL, l=DL, .=NONE.
 */
const CLASSIC_LAYOUT_ROWS: ReadonlyArray<string> = [
  "T..l...T...l..T",
  ".l...L...L...l.",
  "..l...L.L...l..",
  "l..D.......D..l",
  "....l..l..l....",
  ".L...D...D...L.",
  "..L.........L..",
  "T...l..D..l...T",
  "..L.........L..",
  ".L...D...D...L.",
  "....l..l..l....",
  "l..D.......D..l",
  "..l...L.L...l..",
  ".l...L...L...l.",
  "T..l...T...l..T",
];

const CHAR_TO_PREMIUM: Readonly<Record<string, PremiumType>> = {
  T: "TW",
  D: "DW",
  L: "TL",
  l: "DL",
  ".": "NONE",
};

function parseLayout(rows: ReadonlyArray<string>): ReadonlyArray<ReadonlyArray<PremiumType>> {
  const size = rows.length;
  return rows.map((row, r) => {
    if (row.length !== size) {
      throw new Error(`Row ${r} has length ${row.length}, expected ${size}`);
    }
    return Array.from(row, (ch) => {
      const p = CHAR_TO_PREMIUM[ch];
      if (!p) throw new Error(`Unknown layout char '${ch}' at row ${r}`);
      return p;
    });
  });
}

/** The Classic 15×15 board configuration. */
export const CLASSIC_BOARD: BoardConfig = {
  size: CLASSIC_LAYOUT_ROWS.length,
  premiums: parseLayout(CLASSIC_LAYOUT_ROWS),
};
