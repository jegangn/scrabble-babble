import { describe, expect, it } from "vitest";
import { createEmptyBoard, placeTiles } from "../../board.js";
import { CLASSIC_BOARD } from "../../config/board.js";
import { DEFAULT_RULES } from "../../config/rules.js";
import { buildTrie } from "../../dictionary.js";
import { FIXTURE_WORDS } from "../../__fixtures__/dictionary-subset.js";
import type { CellKey, GameState, PlacedTile, Tile } from "../../types.js";
import { generateMoves } from "../move-generator.js";

const DICT = buildTrie(FIXTURE_WORDS);
const T = (l: string, v: number): Tile => ({ kind: "letter", letter: l as "A", value: v });
const PT = (l: string, v: number): PlacedTile => ({
  kind: "letter",
  letter: l as "A",
  value: v,
});

function makeState(rack: Tile[], opts: { board?: Parameters<typeof placeTiles>[0] | undefined } = {}): GameState {
  const board = opts.board ?? createEmptyBoard(CLASSIC_BOARD);
  return {
    seed: 1,
    variant: "classic",
    boardConfig: CLASSIC_BOARD,
    rules: DEFAULT_RULES,
    board,
    bag: [],
    players: [
      { name: "P", rack, score: 0 },
      { name: "Q", rack: [], score: 0 },
    ],
    turn: 0,
    consecutivePasses: 0,
    consumedPremiums: new Set<CellKey>(),
    history: [],
    status: { kind: "in_progress" },
  };
}

describe("generateMoves – opening", () => {
  it("finds moves on an empty board crossing the centre", () => {
    const rack: Tile[] = [
      T("C", 4),
      T("A", 1),
      T("T", 1),
      T("S", 1),
      T("R", 1),
      T("E", 1),
      T("N", 2),
    ];
    const state = makeState(rack);
    const moves = generateMoves(state, DICT);
    expect(moves.length).toBeGreaterThan(0);
    // Every opening move must touch (7, 7)
    for (const c of moves) {
      const touchesCenter = c.move.placements.some(
        (p) => p.position.row === 7 && p.position.col === 7,
      );
      expect(touchesCenter).toBe(true);
    }
  });

  it("picks the highest-scoring opening move when sorted by score desc", () => {
    const rack: Tile[] = [
      T("C", 4),
      T("A", 1),
      T("T", 1),
      T("S", 1),
      T("R", 1),
      T("E", 1),
      T("N", 2),
    ];
    const moves = generateMoves(makeState(rack), DICT);
    for (let i = 1; i < moves.length; i++) {
      expect(moves[i - 1]!.total).toBeGreaterThanOrEqual(moves[i]!.total);
    }
  });
});

describe("generateMoves – connecting", () => {
  it("finds moves that connect to existing anchor tiles", () => {
    // Place CAT at row 7 cols 6,7,8
    const board = placeTiles(createEmptyBoard(CLASSIC_BOARD), [
      { position: { row: 7, col: 6 }, tile: PT("C", 4) },
      { position: { row: 7, col: 7 }, tile: PT("A", 1) },
      { position: { row: 7, col: 8 }, tile: PT("T", 1) },
    ]);
    const rack: Tile[] = [T("S", 1)];
    const state = makeState(rack, { board });
    const moves = generateMoves(state, DICT);
    // Should find S at (7,9) forming CATS
    expect(moves.length).toBeGreaterThan(0);
    const cats = moves.find((m) => m.mainWord === "CATS");
    expect(cats).toBeDefined();
  });

  it("returns an empty list when no legal move exists", () => {
    // Empty rack on non-empty board
    const board = placeTiles(createEmptyBoard(CLASSIC_BOARD), [
      { position: { row: 7, col: 7 }, tile: PT("A", 1) },
    ]);
    const state = makeState([], { board });
    expect(generateMoves(state, DICT)).toEqual([]);
  });
});

describe("generateMoves – performance", () => {
  it("completes opening generation in under 1 s with the fixture dict", () => {
    const rack: Tile[] = [
      T("R", 1),
      T("E", 1),
      T("T", 1),
      T("A", 1),
      T("I", 1),
      T("N", 2),
      T("S", 1),
    ];
    const t0 = performance.now();
    const moves = generateMoves(makeState(rack), DICT);
    const elapsed = performance.now() - t0;
    expect(moves.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(1000);
  });
});
