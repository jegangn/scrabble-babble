import { describe, expect, it } from "vitest";
import { createEmptyBoard } from "../../engine/board.js";
import { CLASSIC_BOARD } from "../../engine/config/board.js";
import type { PlacedTile } from "../../engine/types.js";
import {
  applyPendingToBoard,
  pendingAt,
  pendingKeys,
  pendingToMove,
} from "../../store/pending.js";

const A: PlacedTile = { kind: "letter", letter: "A", value: 1 };
const B: PlacedTile = { kind: "letter", letter: "B", value: 4 };

describe("pending overlay", () => {
  const board = createEmptyBoard(CLASSIC_BOARD);
  const pending = [
    { position: { row: 7, col: 7 }, tile: A, rackIndex: 0 },
    { position: { row: 7, col: 8 }, tile: B, rackIndex: 1 },
  ];

  it("pendingAt finds by position", () => {
    expect(pendingAt(pending, { row: 7, col: 7 })?.tile.letter).toBe("A");
    expect(pendingAt(pending, { row: 0, col: 0 })).toBeNull();
  });

  it("applyPendingToBoard overlays without mutating original", () => {
    const overlaid = applyPendingToBoard(board, pending);
    expect(overlaid.cells[7]![7]!.tile?.letter).toBe("A");
    expect(overlaid.cells[7]![8]!.tile?.letter).toBe("B");
    expect(board.cells[7]![7]!.tile).toBeNull();
  });

  it("returns the same board when pending is empty", () => {
    expect(applyPendingToBoard(board, [])).toBe(board);
  });

  it("pendingToMove builds a PlaceMove with the same tiles", () => {
    const move = pendingToMove(pending);
    expect(move.kind).toBe("place");
    expect(move.placements).toHaveLength(2);
  });

  it("pendingKeys produces a set of CellKey strings", () => {
    const keys = pendingKeys(pending);
    expect(keys.has("7,7")).toBe(true);
    expect(keys.has("7,8")).toBe(true);
    expect(keys.size).toBe(2);
  });
});
