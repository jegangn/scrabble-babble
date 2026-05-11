import { describe, expect, it } from "vitest";
import { buildTrie } from "../dictionary.js";
import { FIXTURE_WORDS } from "../__fixtures__/dictionary-subset.js";
import { createPassMove, createPlaceMove, createResignMove, createSwapMove } from "../move.js";
import {
  validateMove,
  validatePassMove,
  validatePlaceMove,
  validateResignMove,
  validateSwapMove,
} from "../validator.js";
import type { Placement, Tile } from "../types.js";
import { BLANK, BLANK_AS, PT, T, boardWith, makeState } from "./helpers.js";

const DICT = buildTrie(FIXTURE_WORDS);

describe("validatePlaceMove – first move", () => {
  it("accepts a horizontal word crossing center", () => {
    const state = makeState({ rack0: [T("C", 4), T("A"), T("T")] });
    const move = createPlaceMove([
      { position: { row: 7, col: 6 }, tile: PT("C", 4) },
      { position: { row: 7, col: 7 }, tile: PT("A") },
      { position: { row: 7, col: 8 }, tile: PT("T") },
    ]);
    expect(validatePlaceMove(state, move, DICT)).toEqual({ ok: true });
  });

  it("rejects a first move that does not cross center", () => {
    const state = makeState({ rack0: [T("C", 4), T("A"), T("T")] });
    const move = createPlaceMove([
      { position: { row: 0, col: 0 }, tile: PT("C", 4) },
      { position: { row: 0, col: 1 }, tile: PT("A") },
      { position: { row: 0, col: 2 }, tile: PT("T") },
    ]);
    const result = validatePlaceMove(state, move, DICT);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.kind).toBe("first_move_must_cross_center");
  });
});

describe("validatePlaceMove – placement legality", () => {
  it("rejects empty placement list", () => {
    const state = makeState({ rack0: [] });
    const result = validatePlaceMove(state, createPlaceMove([]), DICT);
    expect(result.ok === false && result.error.kind).toBe("empty_placement");
  });

  it("rejects out-of-bounds position", () => {
    const state = makeState({ rack0: [T("A")] });
    const move = createPlaceMove([{ position: { row: -1, col: 0 }, tile: PT("A") }]);
    const result = validatePlaceMove(state, move, DICT);
    expect(result.ok === false && result.error.kind).toBe("out_of_bounds");
  });

  it("rejects already-occupied cells", () => {
    const board = boardWith([{ position: { row: 7, col: 7 }, tile: PT("A") }]);
    const state = makeState({ board, rack0: [T("B", 4)] });
    const move = createPlaceMove([{ position: { row: 7, col: 7 }, tile: PT("B", 4) }]);
    const result = validatePlaceMove(state, move, DICT);
    expect(result.ok === false && result.error.kind).toBe("cell_already_occupied");
  });

  it("rejects duplicate positions in one move", () => {
    const state = makeState({ rack0: [T("A"), T("A")] });
    const move = createPlaceMove([
      { position: { row: 7, col: 7 }, tile: PT("A") },
      { position: { row: 7, col: 7 }, tile: PT("A") },
    ]);
    const result = validatePlaceMove(state, move, DICT);
    expect(result.ok === false && result.error.kind).toBe("duplicate_position");
  });

  it("rejects placements not in a single line", () => {
    const state = makeState({ rack0: [T("A"), T("B", 4)] });
    const move = createPlaceMove([
      { position: { row: 7, col: 7 }, tile: PT("A") },
      { position: { row: 8, col: 8 }, tile: PT("B", 4) },
    ]);
    const result = validatePlaceMove(state, move, DICT);
    expect(result.ok === false && result.error.kind).toBe("not_single_line");
  });

  it("rejects placements with a gap and no anchor", () => {
    const state = makeState({ rack0: [T("C", 4), T("T")] });
    const move = createPlaceMove([
      { position: { row: 7, col: 7 }, tile: PT("C", 4) },
      { position: { row: 7, col: 9 }, tile: PT("T") },
    ]);
    const result = validatePlaceMove(state, move, DICT);
    expect(result.ok === false && result.error.kind).toBe("gap_in_word");
  });

  it("accepts placements bridged by an anchor tile", () => {
    // Pre-existing "A" at (7,8). Play "C" at (7,7) and "T" at (7,9) → forms CAT
    const board = boardWith([{ position: { row: 7, col: 8 }, tile: PT("A") }]);
    const state = makeState({ board, rack0: [T("C", 4), T("T")] });
    const move = createPlaceMove([
      { position: { row: 7, col: 7 }, tile: PT("C", 4) },
      { position: { row: 7, col: 9 }, tile: PT("T") },
    ]);
    expect(validatePlaceMove(state, move, DICT)).toEqual({ ok: true });
  });
});

describe("validatePlaceMove – rack and dictionary", () => {
  it("rejects when a tile is not in the rack", () => {
    const state = makeState({ rack0: [T("A")] });
    const move = createPlaceMove([
      { position: { row: 7, col: 6 }, tile: PT("C", 4) },
      { position: { row: 7, col: 7 }, tile: PT("A") },
      { position: { row: 7, col: 8 }, tile: PT("T") },
    ]);
    const result = validatePlaceMove(state, move, DICT);
    expect(result.ok === false && result.error.kind).toBe("tile_not_in_rack");
  });

  it("accepts a blank tile substituting for a letter", () => {
    const state = makeState({ rack0: [T("C", 4), BLANK, T("T")] });
    const move = createPlaceMove([
      { position: { row: 7, col: 6 }, tile: PT("C", 4) },
      { position: { row: 7, col: 7 }, tile: BLANK_AS("A") },
      { position: { row: 7, col: 8 }, tile: PT("T") },
    ]);
    expect(validatePlaceMove(state, move, DICT)).toEqual({ ok: true });
  });

  it("rejects a word not in the dictionary", () => {
    const state = makeState({ rack0: [T("Z", 10), T("X", 8), T("Q", 10)] });
    const move = createPlaceMove([
      { position: { row: 7, col: 6 }, tile: PT("Z", 10) },
      { position: { row: 7, col: 7 }, tile: PT("X", 8) },
      { position: { row: 7, col: 8 }, tile: PT("Q", 10) },
    ]);
    const result = validatePlaceMove(state, move, DICT);
    expect(result.ok === false && result.error.kind).toBe("invalid_word");
  });
});

describe("validatePlaceMove – connection", () => {
  it("rejects an isolated word on a non-empty board", () => {
    const board = boardWith([{ position: { row: 7, col: 7 }, tile: PT("A") }]);
    const state = makeState({ board, rack0: [T("C", 4), T("A"), T("T")] });
    const move = createPlaceMove([
      { position: { row: 0, col: 0 }, tile: PT("C", 4) },
      { position: { row: 0, col: 1 }, tile: PT("A") },
      { position: { row: 0, col: 2 }, tile: PT("T") },
    ]);
    const result = validatePlaceMove(state, move, DICT);
    expect(result.ok === false && result.error.kind).toBe("not_connected_to_existing");
  });

  it("accepts a connected word via cross-letter", () => {
    // Existing: CAT horizontally at row 7 (cols 6,7,8). Now play "B-Y" vertically through (8,6)? Need anchor at (7,6) which is C.
    // Place "AB" with A at (8,6) below the C → forms vertical "CA" length 2 and horizontal "AB" if (8,7) anchor... let me simplify:
    // Existing: A at (7,7). Play "S" at (7,8) → forms "AS" horizontally.
    const board = boardWith([{ position: { row: 7, col: 7 }, tile: PT("A") }]);
    const state = makeState({ board, rack0: [T("S")] });
    const move = createPlaceMove([{ position: { row: 7, col: 8 }, tile: PT("S") }]);
    expect(validatePlaceMove(state, move, DICT)).toEqual({ ok: true });
  });

  it("rejects a single isolated tile on non-empty board (no word formed)", () => {
    const board = boardWith([{ position: { row: 7, col: 7 }, tile: PT("A") }]);
    const state = makeState({ board, rack0: [T("Z", 10)] });
    const move = createPlaceMove([{ position: { row: 0, col: 0 }, tile: PT("Z", 10) }]);
    const result = validatePlaceMove(state, move, DICT);
    expect(result.ok === false && result.error.kind).toBe("must_form_word");
  });
});

describe("validateSwapMove", () => {
  it("rejects when bag is empty", () => {
    const state = makeState({ rack0: [T("A")], bag: [] });
    const move = createSwapMove([T("A")]);
    const result = validateSwapMove(state, move);
    expect(result.ok === false && result.error.kind).toBe("swap_bag_too_small");
  });

  it("rejects when tile is not in rack", () => {
    const state = makeState({ rack0: [T("A")], bag: [T("B", 4)] });
    const move = createSwapMove([T("Z", 10)]);
    const result = validateSwapMove(state, move);
    expect(result.ok === false && result.error.kind).toBe("swap_tile_not_in_rack");
  });

  it("accepts a valid swap", () => {
    const state = makeState({ rack0: [T("A"), T("B", 4)], bag: [T("C", 4)] });
    const move = createSwapMove([T("A")]);
    expect(validateSwapMove(state, move)).toEqual({ ok: true });
  });

  it("rejects empty tile list", () => {
    const state = makeState({ rack0: [T("A")], bag: [T("B", 4)] });
    const move: ReturnType<typeof createSwapMove> = createSwapMove([] as Tile[]);
    const result = validateSwapMove(state, move);
    expect(result.ok === false && result.error.kind).toBe("empty_placement");
  });
});

describe("validatePassMove / validateResignMove", () => {
  it("accepts pass on a live game", () => {
    expect(validatePassMove(makeState(), createPassMove())).toEqual({ ok: true });
  });

  it("accepts resign on a live game", () => {
    expect(validateResignMove(makeState(), createResignMove())).toEqual({ ok: true });
  });

  it("rejects any move on an ended game", () => {
    const ended = makeState({ ended: true });
    expect(validatePassMove(ended, createPassMove()).ok).toBe(false);
    expect(validateResignMove(ended, createResignMove()).ok).toBe(false);
    expect(validateSwapMove(ended, createSwapMove([T("A")])).ok).toBe(false);
    expect(validatePlaceMove(ended, createPlaceMove([]), DICT).ok).toBe(false);
  });
});

describe("validateMove dispatch", () => {
  it("routes to the right validator by kind", () => {
    expect(validateMove(makeState(), createPassMove(), DICT)).toEqual({ ok: true });
    expect(validateMove(makeState(), createResignMove(), DICT)).toEqual({ ok: true });
  });
});
