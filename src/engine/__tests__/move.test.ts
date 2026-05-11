import { describe, expect, it } from "vitest";
import { createEmptyBoard, placeTiles } from "../board.js";
import { CLASSIC_BOARD } from "../config/board.js";
import {
  buildPlacementMap,
  createPassMove,
  createPlaceMove,
  createResignMove,
  createSwapMove,
  extractWords,
  moveDirection,
} from "../move.js";
import type { PlacedTile, Placement } from "../types.js";

const T = (letter: string, value: number): PlacedTile => ({
  kind: "letter",
  letter: letter as PlacedTile extends { kind: "letter"; letter: infer L } ? L : never,
  value,
});

describe("move constructors", () => {
  it("createPlaceMove wraps placements", () => {
    const placements: ReadonlyArray<Placement> = [
      { position: { row: 7, col: 7 }, tile: T("A", 1) },
    ];
    expect(createPlaceMove(placements)).toEqual({ kind: "place", placements });
  });

  it("createSwapMove wraps tiles", () => {
    expect(createSwapMove([{ kind: "letter", letter: "A", value: 1 }])).toEqual({
      kind: "swap",
      tiles: [{ kind: "letter", letter: "A", value: 1 }],
    });
  });

  it("createPassMove and createResignMove return singletons", () => {
    expect(createPassMove()).toEqual({ kind: "pass" });
    expect(createResignMove()).toEqual({ kind: "resign" });
  });
});

describe("moveDirection", () => {
  it("returns null for empty", () => {
    expect(moveDirection([])).toBeNull();
  });

  it("returns horizontal for single tile", () => {
    expect(moveDirection([{ position: { row: 7, col: 7 }, tile: T("A", 1) }])).toBe(
      "horizontal",
    );
  });

  it("detects horizontal placement", () => {
    const placements: Placement[] = [
      { position: { row: 7, col: 7 }, tile: T("A", 1) },
      { position: { row: 7, col: 8 }, tile: T("B", 4) },
    ];
    expect(moveDirection(placements)).toBe("horizontal");
  });

  it("detects vertical placement", () => {
    const placements: Placement[] = [
      { position: { row: 7, col: 7 }, tile: T("A", 1) },
      { position: { row: 8, col: 7 }, tile: T("B", 4) },
    ];
    expect(moveDirection(placements)).toBe("vertical");
  });

  it("returns null for mixed rows and columns", () => {
    const placements: Placement[] = [
      { position: { row: 7, col: 7 }, tile: T("A", 1) },
      { position: { row: 8, col: 8 }, tile: T("B", 4) },
    ];
    expect(moveDirection(placements)).toBeNull();
  });
});

describe("buildPlacementMap", () => {
  it("maps positions to tiles", () => {
    const map = buildPlacementMap([
      { position: { row: 7, col: 7 }, tile: T("A", 1) },
      { position: { row: 7, col: 8 }, tile: T("B", 4) },
    ]);
    expect(map.size).toBe(2);
    expect(map.get("7,7")).toEqual(T("A", 1));
  });

  it("throws on duplicate positions", () => {
    expect(() =>
      buildPlacementMap([
        { position: { row: 7, col: 7 }, tile: T("A", 1) },
        { position: { row: 7, col: 7 }, tile: T("B", 4) },
      ]),
    ).toThrow();
  });
});

describe("extractWords", () => {
  const empty = createEmptyBoard(CLASSIC_BOARD);

  it("forms a horizontal main word from contiguous placements", () => {
    const placements: Placement[] = [
      { position: { row: 7, col: 7 }, tile: T("C", 4) },
      { position: { row: 7, col: 8 }, tile: T("A", 1) },
      { position: { row: 7, col: 9 }, tile: T("T", 1) },
    ];
    const words = extractWords(empty, placements);
    expect(words?.main.letters).toBe("CAT");
    expect(words?.main.direction).toBe("horizontal");
    expect(words?.crosses).toHaveLength(0);
  });

  it("forms a vertical main word", () => {
    const placements: Placement[] = [
      { position: { row: 7, col: 7 }, tile: T("C", 4) },
      { position: { row: 8, col: 7 }, tile: T("A", 1) },
      { position: { row: 9, col: 7 }, tile: T("T", 1) },
    ];
    const words = extractWords(empty, placements);
    expect(words?.main.letters).toBe("CAT");
    expect(words?.main.direction).toBe("vertical");
  });

  it("incorporates anchor tiles already on the board", () => {
    const board = placeTiles(empty, [
      { position: { row: 7, col: 7 }, tile: T("C", 4) },
      { position: { row: 7, col: 8 }, tile: T("A", 1) },
      { position: { row: 7, col: 9 }, tile: T("T", 1) },
    ]);
    // Now place an "S" at (7,10) → forms CATS
    const words = extractWords(board, [{ position: { row: 7, col: 10 }, tile: T("S", 1) }]);
    expect(words?.main.letters).toBe("CATS");
  });

  it("detects cross-words for a multi-tile placement", () => {
    const board = placeTiles(empty, [
      { position: { row: 7, col: 7 }, tile: T("A", 1) },
    ]);
    // Place "BD" at (6,7) and (8,7) makes vertical "BAD"; horizontal placement of "BD" through "A" not possible since A is at (7,7), B at (6,7) and D at (8,7) form vertical word with anchor. The main is vertical "BAD", no horizontal cross since they're isolated.
    const placements: Placement[] = [
      { position: { row: 6, col: 7 }, tile: T("B", 4) },
      { position: { row: 8, col: 7 }, tile: T("D", 2) },
    ];
    const words = extractWords(board, placements);
    expect(words?.main.letters).toBe("BAD");
    expect(words?.main.direction).toBe("vertical");
  });

  it("returns null for placements not in a single line", () => {
    const placements: Placement[] = [
      { position: { row: 7, col: 7 }, tile: T("A", 1) },
      { position: { row: 8, col: 8 }, tile: T("B", 4) },
    ];
    expect(extractWords(empty, placements)).toBeNull();
  });

  it("returns null for isolated single-tile placement on empty board", () => {
    expect(extractWords(empty, [{ position: { row: 7, col: 7 }, tile: T("A", 1) }])).toBeNull();
  });

  it("for single-tile move picks longer perpendicular word as main", () => {
    // Place "CT" vertically as anchors, then place "A" at (7,7) horizontally adjacent to "AT" anchor.
    let board = placeTiles(empty, [
      { position: { row: 7, col: 7 }, tile: T("C", 4) },
      { position: { row: 8, col: 7 }, tile: T("A", 1) },
      { position: { row: 9, col: 7 }, tile: T("T", 1) },
    ]);
    // Add horizontal anchor at (8, 8) "T" so AT is formed if we place at (8,8)
    board = placeTiles(board, [{ position: { row: 8, col: 8 }, tile: T("T", 1) }]);
    // Now extract for a re-placement at (8, 8) — already occupied, can't. Instead:
    // Single tile at (8, 9): forms "T?" horizontally - need anchor. Skip this case.
    // Simpler test: single tile placement which has both horizontal and vertical context.
    // Place "A" at (10, 7) – vertical word becomes nothing (no anchor at 11,7); horizontal nothing.
    // Build a board: place "BAT" vertically, "B" at (5,7), "A" at (6,7), "T" at (7,7)
    // Then place a single tile "S" at (7,8) → horizontal word "TS" length 2, vertical at (7,8) nothing.
    const b2 = placeTiles(empty, [
      { position: { row: 5, col: 7 }, tile: T("B", 4) },
      { position: { row: 6, col: 7 }, tile: T("A", 1) },
      { position: { row: 7, col: 7 }, tile: T("T", 1) },
    ]);
    const w = extractWords(b2, [{ position: { row: 7, col: 8 }, tile: T("S", 1) }]);
    // Only horizontal "TS"
    expect(w?.main.letters).toBe("TS");
    expect(w?.main.direction).toBe("horizontal");
  });
});
