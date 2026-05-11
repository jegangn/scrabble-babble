import { getCell, isBoardEmpty, isInBounds } from "../board.js";
import type { TrieNode } from "../dictionary.js";
import { lookup } from "../dictionary.js";
import type { Board, Direction, Letter, Position } from "../types.js";

export const ALL_LETTERS: ReadonlyArray<Letter> = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M",
  "N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
];
const ALL_LETTERS_SET: ReadonlySet<Letter> = new Set(ALL_LETTERS);

/**
 * Per-cell allowed-letters set for one direction of move generation.
 *
 * - `null` at filled cells (move generator skips them as fillable slots).
 * - At empty cells, the set is the letters that, if placed here, form a
 *   valid cross-word perpendicular to `mainDirection`.
 * - When no perpendicular cross-word exists (both sides empty), every
 *   letter is allowed (the cross-check is satisfied vacuously).
 */
export type CrossChecks = ReadonlyArray<ReadonlyArray<ReadonlySet<Letter> | null>>;

/** Set of `cellKey` strings marking cells that are valid anchors. */
export type AnchorSet = ReadonlySet<string>;

function letterAt(board: Board, pos: Position): Letter | null {
  if (!isInBounds(board, pos)) return null;
  return getCell(board, pos).tile?.letter ?? null;
}

/**
 * Anchors are empty cells orthogonally adjacent to a filled cell.
 * On an empty board, the only anchor is the centre.
 */
export function findAnchors(board: Board): AnchorSet {
  const out = new Set<string>();
  if (isBoardEmpty(board)) {
    const center = Math.floor(board.size / 2);
    out.add(`${center},${center}`);
    return out;
  }
  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      if (board.cells[r]![c]!.tile !== null) continue;
      const neighbours: Position[] = [
        { row: r - 1, col: c },
        { row: r + 1, col: c },
        { row: r, col: c - 1 },
        { row: r, col: c + 1 },
      ];
      if (neighbours.some((p) => letterAt(board, p) !== null)) {
        out.add(`${r},${c}`);
      }
    }
  }
  return out;
}

/**
 * Compute cross-checks for one main direction.
 *
 * For each empty cell, walk perpendicular to `mainDirection` to find the
 * cross-word that would form if any letter were placed here. Then for each
 * of the 26 letters, dictionary-check the resulting word.
 */
export function computeCrossChecks(
  board: Board,
  dict: TrieNode,
  mainDirection: Direction,
): CrossChecks {
  const dr = mainDirection === "horizontal" ? 1 : 0;
  const dc = mainDirection === "vertical" ? 1 : 0;

  const grid: (ReadonlySet<Letter> | null)[][] = [];
  for (let r = 0; r < board.size; r++) {
    const row: (ReadonlySet<Letter> | null)[] = [];
    for (let c = 0; c < board.size; c++) {
      if (board.cells[r]![c]!.tile !== null) {
        row.push(null);
        continue;
      }
      // Walk up (or left), collecting prefix
      let prefix = "";
      let rr = r - dr;
      let cc = c - dc;
      while (true) {
        const L = letterAt(board, { row: rr, col: cc });
        if (!L) break;
        prefix = L + prefix;
        rr -= dr;
        cc -= dc;
      }
      // Walk down (or right), collecting suffix
      let suffix = "";
      rr = r + dr;
      cc = c + dc;
      while (true) {
        const L = letterAt(board, { row: rr, col: cc });
        if (!L) break;
        suffix += L;
        rr += dr;
        cc += dc;
      }
      if (prefix.length === 0 && suffix.length === 0) {
        // No cross-word forms; every letter is acceptable.
        row.push(ALL_LETTERS_SET);
        continue;
      }
      const allowed = new Set<Letter>();
      for (const L of ALL_LETTERS) {
        if (lookup(dict, prefix + L + suffix)) allowed.add(L);
      }
      row.push(allowed);
    }
    grid.push(row);
  }
  return grid;
}
