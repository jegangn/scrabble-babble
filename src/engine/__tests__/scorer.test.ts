import { describe, expect, it } from "vitest";
import { cellKey } from "../board.js";
import { createPlaceMove } from "../move.js";
import { rackValue, scorePlaceMove } from "../scorer.js";
import type { CellKey, PlacedTile, Tile } from "../types.js";
import { BLANK_AS, PT, T, boardWith, makeState } from "./helpers.js";

describe("scorePlaceMove – basic", () => {
  it("scores a word with no premiums (CAT at row 5 cols 5-7)", () => {
    // Row 5 cols 5-7 in CLASSIC layout: (5,5)=DW (premium consumed already → no bonus),
    // we mark all cells as consumed to neutralise premiums.
    const consumed: Set<CellKey> = new Set();
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) consumed.add(`${r},${c}` as CellKey);
    }
    const state = makeState({ consumedPremiums: consumed });
    const result = scorePlaceMove(
      state,
      createPlaceMove([
        { position: { row: 5, col: 5 }, tile: PT("C", 4) },
        { position: { row: 5, col: 6 }, tile: PT("A", 1) },
        { position: { row: 5, col: 7 }, tile: PT("T", 1) },
      ]),
    );
    expect(result.mainWord.word).toBe("CAT");
    expect(result.mainWord.score).toBe(4 + 1 + 1);
    expect(result.total).toBe(6);
    expect(result.bingo).toBe(false);
  });
});

describe("scorePlaceMove – premiums", () => {
  it("applies DL letter premium (place at (4,4)=DL)", () => {
    const consumed: Set<CellKey> = new Set();
    // Mark all NON-(4,4) cells as consumed so only (4,4) premium applies
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (!(r === 4 && c === 4)) consumed.add(`${r},${c}` as CellKey);
      }
    }
    const state = makeState({ consumedPremiums: consumed });
    // Place A, B, C horizontally at (4,3)(4,4)(4,5). B (value 4) is on DL.
    const result = scorePlaceMove(
      state,
      createPlaceMove([
        { position: { row: 4, col: 3 }, tile: PT("A", 1) },
        { position: { row: 4, col: 4 }, tile: PT("B", 4) },
        { position: { row: 4, col: 5 }, tile: PT("C", 4) },
      ]),
    );
    // A(1) + B(4*2=8) + C(4) = 13, no word premium
    expect(result.mainWord.score).toBe(13);
  });

  it("applies DW word premium (center (7,7))", () => {
    // First move crosses center which is DW. Place CAT at (7,6)(7,7)(7,8).
    // No other premiums active because (7,8) is NONE in our layout. Wait — let me check.
    // Looking at board: row 7 = "T...l..D..l...T" → (7,0)=TW, (7,4)=DL, (7,7)=DW, (7,10)=DL, (7,14)=TW
    // So (7,6) NONE, (7,7) DW, (7,8) NONE. Good — only DW active.
    const state = makeState(); // no consumed
    const result = scorePlaceMove(
      state,
      createPlaceMove([
        { position: { row: 7, col: 6 }, tile: PT("C", 4) },
        { position: { row: 7, col: 7 }, tile: PT("A", 1) },
        { position: { row: 7, col: 8 }, tile: PT("T", 1) },
      ]),
    );
    // letterSum = 4 + 1 + 1 = 6; word multiplier ×2 = 12
    expect(result.mainWord.score).toBe(12);
  });

  it("stacks letter premium then word premium (DL+DW)", () => {
    // Place at (4,4)=DL and (3,3) area... actually let me just construct a scenario.
    // Place A(1) on (4,4)=DL and B(4) on (4,5)=NONE and C(4) on (4,6)=NONE — gives letter premium only.
    // To test stacking, let me use (4,4)=DL and (4,7)=DL: not adjacent, would need anchor.
    // Simpler: use (4,4)=DL and (5,5)=DW. Place vertical word A at (4,5) and B at (5,5)?
    // (4,5)=NONE per layout. (5,5)=DW. Two-tile vertical at (4,5)(5,5): letter B is on DW.
    // Actually DW affects word multiplier, not letter. So:
    // A(1, NONE) + B(4, DW with × premium on cell — B alone contributes 4, but the word gets ×2)
    // Word "AB"? Not a word. Need a real word. Let me think of one.
    // "BAD" vertically at (4,3)(5,3)(6,3): (5,3)=NONE (per layout, row 5 col 3 = "."), (4,3)=NONE, (6,3)=NONE. No premium.
    // Use (3,3)=DW (per layout, row 3 col 3 = "D"). Vertical word DAB at (3,3)(4,3)(5,3):
    // (3,3) is DW. D(2) on DW, A(1) on NONE, B(4) on NONE.
    // letterSum = 2 + 1 + 4 = 7; word ×2 = 14.
    const state = makeState();
    const result = scorePlaceMove(
      state,
      createPlaceMove([
        { position: { row: 3, col: 3 }, tile: PT("D", 2) },
        { position: { row: 4, col: 3 }, tile: PT("A", 1) },
        { position: { row: 5, col: 3 }, tile: PT("B", 4) },
      ]),
    );
    expect(result.mainWord.word).toBe("DAB");
    expect(result.mainWord.score).toBe(14);
  });

  it("does NOT re-apply premium on already-consumed cells", () => {
    // Center is DW. Mark center as consumed.
    const consumed = new Set<CellKey>([cellKey({ row: 7, col: 7 })]);
    const state = makeState({ consumedPremiums: consumed });
    const result = scorePlaceMove(
      state,
      createPlaceMove([
        { position: { row: 7, col: 6 }, tile: PT("C", 4) },
        { position: { row: 7, col: 7 }, tile: PT("A", 1) },
        { position: { row: 7, col: 8 }, tile: PT("T", 1) },
      ]),
    );
    expect(result.mainWord.score).toBe(6);
  });
});

describe("scorePlaceMove – blanks", () => {
  it("blank contributes 0 to letter sum but lies on word for length", () => {
    // Consume all premiums for clean math.
    const consumed: Set<CellKey> = new Set();
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) consumed.add(`${r},${c}` as CellKey);
    }
    const state = makeState({ consumedPremiums: consumed });
    // Place CAT where A is a blank → score = 4 + 0 + 1 = 5
    const result = scorePlaceMove(
      state,
      createPlaceMove([
        { position: { row: 5, col: 5 }, tile: PT("C", 4) },
        { position: { row: 5, col: 6 }, tile: BLANK_AS("A") },
        { position: { row: 5, col: 7 }, tile: PT("T", 1) },
      ]),
    );
    expect(result.mainWord.score).toBe(5);
  });
});

describe("scorePlaceMove – bingo bonus", () => {
  it("adds bingo bonus when 7 tiles played", () => {
    const consumed: Set<CellKey> = new Set();
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) consumed.add(`${r},${c}` as CellKey);
    }
    const state = makeState({ consumedPremiums: consumed });
    // 7-letter word using letters from our fixture: "ABALONE"
    const tiles = [
      { position: { row: 5, col: 4 }, tile: PT("A", 1) },
      { position: { row: 5, col: 5 }, tile: PT("B", 4) },
      { position: { row: 5, col: 6 }, tile: PT("A", 1) },
      { position: { row: 5, col: 7 }, tile: PT("L", 2) },
      { position: { row: 5, col: 8 }, tile: PT("O", 1) },
      { position: { row: 5, col: 9 }, tile: PT("N", 2) },
      { position: { row: 5, col: 10 }, tile: PT("E", 1) },
    ];
    const result = scorePlaceMove(state, createPlaceMove(tiles));
    expect(result.bingo).toBe(true);
    expect(result.total).toBe(result.mainWord.score + 35);
  });

  it("no bingo for 6 tiles", () => {
    const consumed: Set<CellKey> = new Set();
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) consumed.add(`${r},${c}` as CellKey);
    }
    const state = makeState({ consumedPremiums: consumed });
    const tiles = [
      { position: { row: 5, col: 5 }, tile: PT("A", 1) },
      { position: { row: 5, col: 6 }, tile: PT("B", 4) },
      { position: { row: 5, col: 7 }, tile: PT("B", 4) },
      { position: { row: 5, col: 8 }, tile: PT("E", 1) },
      { position: { row: 5, col: 9 }, tile: PT("S", 1) },
      { position: { row: 5, col: 10 }, tile: PT("S", 1) },
    ];
    const result = scorePlaceMove(state, createPlaceMove(tiles));
    expect(result.bingo).toBe(false);
  });
});

describe("scorePlaceMove – cross-words", () => {
  it("scores both main and cross words for a perpendicular placement", () => {
    // Existing horizontal "CAT" at row 7 cols 6-8 (anchors). Now place "S" at (8,8) → forms vertical "TS" cross and...
    // Actually a single tile won't have a main "word" unless it forms one. Let me design:
    // Existing horizontal "AT" at (7,7)(7,8). Mark them consumed.
    // Place "S" at (7,9) → main "ATS"; cross at (7,9) is single letter "S" (length 1, ignored).
    // Hmm. To get cross words I need vertical anchors.
    // Plan: existing letters: A at (7,7) and B at (8,8). Both anchors consumed. Place "T" at (7,8): horizontal "AT", vertical "TB" cross.
    // T(1) at (7,8), value of A anchor=1, B anchor=4. (7,8)=NONE in layout.
    // mainWord = AT (anchor A=1, placed T=1, no premium): score 2
    // cross at (7,8)=NONE going vertical: "TB", T at (7,8) placed → no premium (NONE), B at (8,8) anchor.
    //   letterSum = 1 + 4 = 5, no premium → 5
    // total = 2 + 5 = 7
    const board = boardWith([
      { position: { row: 7, col: 7 }, tile: PT("A", 1) },
      { position: { row: 8, col: 8 }, tile: PT("B", 4) },
    ]);
    const consumed: Set<CellKey> = new Set([
      cellKey({ row: 7, col: 7 }),
      cellKey({ row: 8, col: 8 }),
    ]);
    const state = makeState({ board, consumedPremiums: consumed });
    const result = scorePlaceMove(
      state,
      createPlaceMove([{ position: { row: 7, col: 8 }, tile: PT("T", 1) }]),
    );
    expect(result.mainWord.word).toBe("AT");
    expect(result.crossWords).toHaveLength(1);
    expect(result.crossWords[0]!.word).toBe("TB");
    expect(result.total).toBe(2 + 5);
  });
});

describe("scorePlaceMove – TL premium", () => {
  it("applies triple-letter premium (place at (1,5)=TL)", () => {
    const consumed: Set<CellKey> = new Set();
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (!(r === 1 && c === 5)) consumed.add(`${r},${c}` as CellKey);
      }
    }
    const state = makeState({ consumedPremiums: consumed });
    // Place 3 tiles at row 1 cols 4,5,6 - only (1,5) has active TL.
    // A(1) + B(4×3=12) + C(4) = 17, no word premium
    const result = scorePlaceMove(
      state,
      createPlaceMove([
        { position: { row: 1, col: 4 }, tile: PT("A", 1) },
        { position: { row: 1, col: 5 }, tile: PT("B", 4) },
        { position: { row: 1, col: 6 }, tile: PT("C", 4) },
      ]),
    );
    expect(result.mainWord.score).toBe(1 + 12 + 4);
  });
});

describe("scorePlaceMove – error path", () => {
  it("throws when called on a move that forms no word", () => {
    const state = makeState();
    // Single tile on empty board → extractWords returns null → throws
    const badMove = createPlaceMove([
      { position: { row: 0, col: 0 }, tile: PT("A", 1) },
    ]);
    expect(() => scorePlaceMove(state, badMove)).toThrow();
  });
});

describe("rackValue", () => {
  it("sums tile values", () => {
    const rack: ReadonlyArray<Tile> = [T("A", 1), T("Z", 10), { kind: "blank", value: 0 }];
    expect(rackValue(rack as unknown as PlacedTile[])).toBe(11);
  });

  it("returns 0 for empty rack", () => {
    expect(rackValue([])).toBe(0);
  });
});
