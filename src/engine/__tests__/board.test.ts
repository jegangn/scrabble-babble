import { describe, expect, it } from "vitest";
import {
  cellKey,
  createEmptyBoard,
  getCell,
  isBoardEmpty,
  isInBounds,
  isOccupied,
  iterateCells,
  parseCellKey,
  placeTiles,
} from "../board.js";
import { CLASSIC_BOARD } from "../config/board.js";
import type { PlacedTile, Position } from "../types.js";

const A_TILE: PlacedTile = { kind: "letter", letter: "A", value: 1 };
const B_TILE: PlacedTile = { kind: "letter", letter: "B", value: 4 };
const BLANK_AS_Q: PlacedTile = { kind: "blank", letter: "Q", value: 0 };

describe("cellKey / parseCellKey", () => {
  it("round-trips", () => {
    const pos: Position = { row: 3, col: 7 };
    expect(cellKey(pos)).toBe("3,7");
    expect(parseCellKey(cellKey(pos))).toEqual(pos);
  });
});

describe("createEmptyBoard", () => {
  const board = createEmptyBoard(CLASSIC_BOARD);

  it("produces a 15×15 grid with no tiles", () => {
    expect(board.size).toBe(15);
    expect(board.cells).toHaveLength(15);
    for (const row of board.cells) {
      expect(row).toHaveLength(15);
      for (const cell of row) expect(cell.tile).toBeNull();
    }
  });

  it("preserves premium layout at corners", () => {
    expect(board.cells[0]![0]!.premium).toBe("TW");
    expect(board.cells[7]![7]!.premium).toBe("DW");
  });
});

describe("placeTiles", () => {
  const empty = createEmptyBoard(CLASSIC_BOARD);

  it("places a single tile and does not mutate input", () => {
    const next = placeTiles(empty, [{ position: { row: 7, col: 7 }, tile: A_TILE }]);
    expect(getCell(next, { row: 7, col: 7 }).tile).toEqual(A_TILE);
    expect(getCell(empty, { row: 7, col: 7 }).tile).toBeNull();
  });

  it("places multiple tiles in one call", () => {
    const next = placeTiles(empty, [
      { position: { row: 7, col: 7 }, tile: A_TILE },
      { position: { row: 7, col: 8 }, tile: B_TILE },
      { position: { row: 7, col: 9 }, tile: BLANK_AS_Q },
    ]);
    expect(getCell(next, { row: 7, col: 7 }).tile?.kind).toBe("letter");
    expect(getCell(next, { row: 7, col: 9 }).tile?.kind).toBe("blank");
  });

  it("throws on out-of-bounds placement", () => {
    expect(() =>
      placeTiles(empty, [{ position: { row: -1, col: 0 }, tile: A_TILE }]),
    ).toThrow();
    expect(() =>
      placeTiles(empty, [{ position: { row: 15, col: 0 }, tile: A_TILE }]),
    ).toThrow();
  });

  it("throws when placing on an occupied cell", () => {
    const once = placeTiles(empty, [{ position: { row: 7, col: 7 }, tile: A_TILE }]);
    expect(() =>
      placeTiles(once, [{ position: { row: 7, col: 7 }, tile: B_TILE }]),
    ).toThrow();
  });

  it("preserves premium category on placed cell", () => {
    const next = placeTiles(empty, [{ position: { row: 0, col: 0 }, tile: A_TILE }]);
    expect(getCell(next, { row: 0, col: 0 }).premium).toBe("TW");
  });
});

describe("isInBounds / isOccupied / isBoardEmpty / iterateCells", () => {
  const empty = createEmptyBoard(CLASSIC_BOARD);

  it("isInBounds checks edges correctly", () => {
    expect(isInBounds(empty, { row: 0, col: 0 })).toBe(true);
    expect(isInBounds(empty, { row: 14, col: 14 })).toBe(true);
    expect(isInBounds(empty, { row: 15, col: 0 })).toBe(false);
    expect(isInBounds(empty, { row: -1, col: 0 })).toBe(false);
  });

  it("getCell throws out of bounds", () => {
    expect(() => getCell(empty, { row: -1, col: 0 })).toThrow();
  });

  it("isOccupied is false on empty, true after placement", () => {
    expect(isOccupied(empty, { row: 0, col: 0 })).toBe(false);
    const next = placeTiles(empty, [{ position: { row: 0, col: 0 }, tile: A_TILE }]);
    expect(isOccupied(next, { row: 0, col: 0 })).toBe(true);
  });

  it("isBoardEmpty true initially, false after placement", () => {
    expect(isBoardEmpty(empty)).toBe(true);
    const next = placeTiles(empty, [{ position: { row: 1, col: 1 }, tile: A_TILE }]);
    expect(isBoardEmpty(next)).toBe(false);
  });

  it("iterateCells visits every cell once in row-major order", () => {
    let count = 0;
    const seen = new Set<string>();
    for (const { position } of iterateCells(empty)) {
      seen.add(cellKey(position));
      count++;
    }
    expect(count).toBe(15 * 15);
    expect(seen.size).toBe(225);
  });
});
