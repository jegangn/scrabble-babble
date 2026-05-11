import { cellKey } from "../engine/board.js";
import { createPlaceMove } from "../engine/move.js";
import type { Board, CellKey, PlaceMove, PlacedTile, Position } from "../engine/types.js";

/**
 * A tile placed by the player but not yet committed via Submit.
 * `rackIndex` is the original slot in the rack so Recall can put it back in place.
 */
export interface PendingPlacement {
  readonly position: Position;
  readonly tile: PlacedTile;
  readonly rackIndex: number;
}

/** Return the pending placement at a given position, or null. */
export function pendingAt(
  pending: ReadonlyArray<PendingPlacement>,
  position: Position,
): PendingPlacement | null {
  return (
    pending.find(
      (p) => p.position.row === position.row && p.position.col === position.col,
    ) ?? null
  );
}

/**
 * Build a transient board view that overlays pending placements on top of the
 * committed board. Used for word extraction and display while a move is being
 * built but not yet submitted.
 */
export function applyPendingToBoard(
  board: Board,
  pending: ReadonlyArray<PendingPlacement>,
): Board {
  if (pending.length === 0) return board;
  const cells = board.cells.map((row) => row.slice());
  for (const p of pending) {
    const cell = cells[p.position.row]![p.position.col]!;
    cells[p.position.row]![p.position.col] = { premium: cell.premium, tile: p.tile };
  }
  return { size: board.size, cells };
}

/** Convert pending placements into a committable PlaceMove. */
export function pendingToMove(pending: ReadonlyArray<PendingPlacement>): PlaceMove {
  return createPlaceMove(pending.map((p) => ({ position: p.position, tile: p.tile })));
}

/** Set of `${row},${col}` strings for fast pending-cell lookup in UI. */
export function pendingKeys(pending: ReadonlyArray<PendingPlacement>): ReadonlySet<CellKey> {
  return new Set(pending.map((p) => cellKey(p.position)));
}
