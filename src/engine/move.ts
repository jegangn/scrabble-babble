import { cellKey, getCell, isInBounds } from "./board.js";
import type {
  Board,
  CellKey,
  Direction,
  PassMove,
  PlaceMove,
  Placement,
  PlacedTile,
  Position,
  ResignMove,
  SwapMove,
  Tile,
} from "./types.js";

/** Build a place-move with the given placements. */
export function createPlaceMove(placements: ReadonlyArray<Placement>): PlaceMove {
  return { kind: "place", placements };
}

/** Build a swap-move returning the given rack tiles to the bag. */
export function createSwapMove(tiles: ReadonlyArray<Tile>): SwapMove {
  return { kind: "swap", tiles };
}

/** Build a pass-move. */
export function createPassMove(): PassMove {
  return { kind: "pass" };
}

/** Build a resign-move. */
export function createResignMove(): ResignMove {
  return { kind: "resign" };
}

/**
 * Detect whether placements lie on a single horizontal or vertical line.
 *
 * Returns `"horizontal"` or `"vertical"` if they do, or `null` if mixed or empty.
 * A single-tile placement defaults to `"horizontal"` for direction purposes;
 * callers should treat single-tile word extraction symmetrically.
 */
export function moveDirection(
  placements: ReadonlyArray<Placement>,
): Direction | null {
  if (placements.length === 0) return null;
  if (placements.length === 1) return "horizontal";
  const first = placements[0]!.position;
  const allSameRow = placements.every((p) => p.position.row === first.row);
  const allSameCol = placements.every((p) => p.position.col === first.col);
  if (allSameRow && !allSameCol) return "horizontal";
  if (allSameCol && !allSameRow) return "vertical";
  return null;
}

/** A single word formed by a move. */
export interface ExtractedWord {
  readonly direction: Direction;
  readonly positions: ReadonlyArray<Position>;
  readonly letters: string;
}

/** All words formed by a place move. */
export interface ExtractedWords {
  readonly main: ExtractedWord;
  readonly crosses: ReadonlyArray<ExtractedWord>;
}

function effectiveTile(
  board: Board,
  byKey: ReadonlyMap<CellKey, PlacedTile>,
  pos: Position,
): PlacedTile | null {
  const placed = byKey.get(cellKey(pos));
  if (placed) return placed;
  if (!isInBounds(board, pos)) return null;
  return getCell(board, pos).tile;
}

/**
 * Walk the maximal contiguous run of occupied cells through `start` in `direction`.
 * Returns `null` if the run has length < 2.
 */
function walkWord(
  board: Board,
  byKey: ReadonlyMap<CellKey, PlacedTile>,
  start: Position,
  direction: Direction,
): ExtractedWord | null {
  const dr = direction === "vertical" ? 1 : 0;
  const dc = direction === "horizontal" ? 1 : 0;

  let r = start.row;
  let c = start.col;
  while (effectiveTile(board, byKey, { row: r - dr, col: c - dc }) !== null) {
    r -= dr;
    c -= dc;
  }

  const positions: Position[] = [];
  let letters = "";
  while (true) {
    const pos = { row: r, col: c };
    const tile = effectiveTile(board, byKey, pos);
    if (!tile) break;
    positions.push(pos);
    letters += tile.letter;
    r += dr;
    c += dc;
  }

  if (positions.length < 2) return null;
  return { direction, positions, letters };
}

/**
 * Build a map from CellKey to PlacedTile for the placements in a move.
 * Throws on duplicate positions.
 */
export function buildPlacementMap(
  placements: ReadonlyArray<Placement>,
): ReadonlyMap<CellKey, PlacedTile> {
  const map = new Map<CellKey, PlacedTile>();
  for (const p of placements) {
    const key = cellKey(p.position);
    if (map.has(key)) {
      throw new Error(`Duplicate placement at ${key}`);
    }
    map.set(key, p.tile);
  }
  return map;
}

/**
 * Extract the main word and all cross-words formed by the placements.
 *
 * Conventions:
 * - Multi-tile placements: main word follows the placement direction.
 * - Single-tile placements: main word is the longer of the two perpendicular
 *   words (tie → horizontal). The shorter one becomes a cross-word.
 *
 * Returns `null` if no word of length ≥ 2 is formed.
 */
export function extractWords(
  board: Board,
  placements: ReadonlyArray<Placement>,
): ExtractedWords | null {
  if (placements.length === 0) return null;
  const dir = moveDirection(placements);
  if (!dir) return null;

  const byKey = buildPlacementMap(placements);
  const anyPos = placements[0]!.position;

  let mainDir: Direction;
  let main: ExtractedWord | null;

  if (placements.length === 1) {
    const horiz = walkWord(board, byKey, anyPos, "horizontal");
    const vert = walkWord(board, byKey, anyPos, "vertical");
    if (horiz && vert) {
      if (vert.positions.length > horiz.positions.length) {
        main = vert;
        mainDir = "vertical";
      } else {
        main = horiz;
        mainDir = "horizontal";
      }
    } else if (horiz) {
      main = horiz;
      mainDir = "horizontal";
    } else if (vert) {
      main = vert;
      mainDir = "vertical";
    } else {
      return null;
    }
  } else {
    main = walkWord(board, byKey, anyPos, dir);
    mainDir = dir;
    if (!main) return null;
  }

  const crossDir: Direction = mainDir === "horizontal" ? "vertical" : "horizontal";

  const crosses: ExtractedWord[] = [];
  if (placements.length === 1) {
    const other = walkWord(board, byKey, anyPos, crossDir);
    if (other) crosses.push(other);
  } else {
    for (const p of placements) {
      const cross = walkWord(board, byKey, p.position, crossDir);
      if (cross) crosses.push(cross);
    }
  }

  return { main, crosses };
}
