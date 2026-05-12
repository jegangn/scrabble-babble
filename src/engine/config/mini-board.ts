import type { BoardConfig, PremiumType } from "../types.js";

/**
 * Mini 11×11 premium layout.
 *
 * 4-fold rotationally symmetric. 29 premium cells on 121 total (24%):
 * 4 TW, 5 DW (incl. center starting star), 8 TL, 12 DL.
 *
 * Orbits chosen (under (r,c) → (c, 10-r)):
 *   TW    {(0,0), (0,10), (10,10), (10,0)}     — corners
 *   DW    {(1,1), (1,9), (9,9), (9,1)} + (5,5) — diagonal + center
 *   TL #1 {(1,5), (5,9), (9,5), (5,1)}         — cross-axis mids
 *   TL #2 {(3,3), (3,7), (7,7), (7,3)}         — inner diamond
 *   DL #1 {(0,3), (3,10), (10,7), (7,0)}       — outer rotational
 *   DL #2 {(0,5), (5,10), (10,5), (5,0)}       — cross-axis edges
 *   DL #3 {(2,2), (2,8), (8,8), (8,2)}         — second-ring diagonal
 *
 * Char map: T=TW, D=DW, L=TL, l=DL, .=NONE. Verified by `mini-board.test.ts`.
 */
const MINI_LAYOUT_ROWS: ReadonlyArray<string> = [
  "T..l.l....T",
  ".D...L...D.",
  "..l.....l..",
  "...L...L..l",
  "...........",
  "lL...D...Ll",
  "...........",
  "l..L...L...",
  "..l.....l..",
  ".D...L...D.",
  "T....l.l..T",
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

/** The Mini 11×11 board configuration. */
export const MINI_BOARD: BoardConfig = {
  size: MINI_LAYOUT_ROWS.length,
  premiums: parseLayout(MINI_LAYOUT_ROWS),
};
