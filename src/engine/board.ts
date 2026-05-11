import type {
  Board,
  BoardCell,
  BoardConfig,
  CellKey,
  PlacedTile,
  Position,
} from "./types.js";

/**
 * Build a canonical string key for a position. Used as the key type for
 * the `consumedPremiums` set and ad-hoc lookups.
 *
 * @example cellKey({ row: 3, col: 7 }) // "3,7"
 */
export function cellKey(pos: Position): CellKey {
  return `${pos.row},${pos.col}`;
}

/**
 * Parse a CellKey back into a Position.
 */
export function parseCellKey(key: CellKey): Position {
  const [r, c] = key.split(",");
  return { row: Number(r), col: Number(c) };
}

/** Whether `pos` lies inside `board`. */
export function isInBounds(board: Board, pos: Position): boolean {
  return pos.row >= 0 && pos.row < board.size && pos.col >= 0 && pos.col < board.size;
}

/**
 * Get the cell at `pos`. Throws if out of bounds — callers are expected to
 * have validated bounds first (see {@link isInBounds}).
 */
export function getCell(board: Board, pos: Position): BoardCell {
  if (!isInBounds(board, pos)) {
    throw new Error(`Position out of bounds: ${cellKey(pos)}`);
  }
  return board.cells[pos.row]![pos.col]!;
}

/** True iff the cell at `pos` already holds a tile. */
export function isOccupied(board: Board, pos: Position): boolean {
  return getCell(board, pos).tile !== null;
}

/**
 * Create an empty board from a configuration. Premium grid is copied
 * shallowly into the cell array; tiles all start `null`.
 *
 * @example
 * const board = createEmptyBoard(CLASSIC_BOARD);
 * board.size; // 15
 */
export function createEmptyBoard(config: BoardConfig): Board {
  const cells: BoardCell[][] = [];
  for (let r = 0; r < config.size; r++) {
    const row: BoardCell[] = [];
    for (let c = 0; c < config.size; c++) {
      row.push({ premium: config.premiums[r]![c]!, tile: null });
    }
    cells.push(row);
  }
  return { size: config.size, cells };
}

/**
 * Place tiles on the board. Returns a new board; the input is not mutated.
 *
 * Throws on out-of-bounds or already-occupied placements — these should have
 * been rejected by the validator before reaching this function.
 */
export function placeTiles(
  board: Board,
  placements: ReadonlyArray<{ readonly position: Position; readonly tile: PlacedTile }>,
): Board {
  const cells = board.cells.map((row) => row.slice());
  for (const { position, tile } of placements) {
    if (!isInBounds(board, position)) {
      throw new Error(`placeTiles: out of bounds at ${cellKey(position)}`);
    }
    const existing = cells[position.row]![position.col]!;
    if (existing.tile !== null) {
      throw new Error(`placeTiles: cell already occupied at ${cellKey(position)}`);
    }
    cells[position.row]![position.col] = { premium: existing.premium, tile };
  }
  return { size: board.size, cells };
}

/** Yield every cell with its position. Iteration order is row-major. */
export function* iterateCells(
  board: Board,
): Generator<{ readonly position: Position; readonly cell: BoardCell }, void, void> {
  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      yield { position: { row: r, col: c }, cell: board.cells[r]![c]! };
    }
  }
}

/** True iff the board has no placed tiles. */
export function isBoardEmpty(board: Board): boolean {
  for (const { cell } of iterateCells(board)) {
    if (cell.tile !== null) return false;
  }
  return true;
}
