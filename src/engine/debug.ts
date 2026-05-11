import type { Board, PremiumType } from "./types.js";

const PREMIUM_MARK: Record<PremiumType, string> = {
  NONE: " . ",
  DL: "dl ",
  TL: "tl ",
  DW: "dw ",
  TW: "TW ",
};

/**
 * Render a board as an ASCII grid for debugging.
 *
 * - Empty premium cells show their type (TW/dw/tl/dl) or "." for plain.
 * - Placed tiles show as uppercase letters with a trailing space.
 * - The center starting star (DW) is shown as " ★ " when empty.
 *
 * Row and column indices are printed along the top and left.
 *
 * @example
 * console.log(renderBoard(board));
 */
export function renderBoard(board: Board): string {
  const size = board.size;
  const lines: string[] = [];

  // Header row: column indices
  let header = "    ";
  for (let c = 0; c < size; c++) header += c.toString().padStart(2, " ") + " ";
  lines.push(header);

  for (let r = 0; r < size; r++) {
    let line = r.toString().padStart(2, " ") + "  ";
    for (let c = 0; c < size; c++) {
      const cell = board.cells[r]![c]!;
      if (cell.tile) {
        line += " " + cell.tile.letter + " ";
      } else if (r === Math.floor(size / 2) && c === Math.floor(size / 2)) {
        line += " ★ ";
      } else {
        line += PREMIUM_MARK[cell.premium];
      }
    }
    lines.push(line);
  }

  return lines.join("\n");
}
