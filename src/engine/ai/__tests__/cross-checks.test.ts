import { describe, expect, it } from "vitest";
import { createEmptyBoard, placeTiles } from "../../board.js";
import { CLASSIC_BOARD } from "../../config/board.js";
import { buildTrie } from "../../dictionary.js";
import { FIXTURE_WORDS } from "../../__fixtures__/dictionary-subset.js";
import type { PlacedTile } from "../../types.js";
import {
  ALL_LETTERS,
  computeCrossChecks,
  findAnchors,
} from "../cross-checks.js";

const DICT = buildTrie(FIXTURE_WORDS);
const PT = (l: string, v = 1): PlacedTile => ({ kind: "letter", letter: l as "A", value: v });

describe("findAnchors", () => {
  it("returns only the centre on an empty board", () => {
    const board = createEmptyBoard(CLASSIC_BOARD);
    const anchors = findAnchors(board);
    expect(anchors.size).toBe(1);
    expect(anchors.has("7,7")).toBe(true);
  });

  it("returns empty neighbours of filled cells", () => {
    const board = placeTiles(createEmptyBoard(CLASSIC_BOARD), [
      { position: { row: 7, col: 7 }, tile: PT("A") },
    ]);
    const anchors = findAnchors(board);
    expect(anchors.has("7,7")).toBe(false); // filled
    expect(anchors.has("6,7")).toBe(true);
    expect(anchors.has("8,7")).toBe(true);
    expect(anchors.has("7,6")).toBe(true);
    expect(anchors.has("7,8")).toBe(true);
    expect(anchors.has("5,7")).toBe(false); // not adjacent
  });
});

describe("computeCrossChecks", () => {
  it("permits every letter at all cells on an empty board", () => {
    const board = createEmptyBoard(CLASSIC_BOARD);
    const checks = computeCrossChecks(board, DICT, "horizontal");
    expect(checks[7]![7]!).not.toBeNull();
    expect(checks[7]![7]!.size).toBe(26);
  });

  it("returns null for filled cells", () => {
    const board = placeTiles(createEmptyBoard(CLASSIC_BOARD), [
      { position: { row: 7, col: 7 }, tile: PT("A") },
    ]);
    const checks = computeCrossChecks(board, DICT, "horizontal");
    expect(checks[7]![7]!).toBeNull();
  });

  it("restricts to dictionary-valid letters at an empty cell with vertical neighbours", () => {
    // Place 'A' at (7,7) and 'T' at (9,7). Cell (8,7) is empty with vertical
    // context "A_T". Horizontal moves placing a tile at (8,7) form cross-word
    // "A<L>T" vertically. ALT, ANT, AT-T... -> ANT, APT, ANT.
    // From fixture, ANT is present. ART is in the fixture too. ANT matches A_T.
    const board = placeTiles(createEmptyBoard(CLASSIC_BOARD), [
      { position: { row: 7, col: 7 }, tile: PT("A") },
      { position: { row: 9, col: 7 }, tile: PT("T") },
    ]);
    const checks = computeCrossChecks(board, DICT, "horizontal");
    const allowed = checks[8]![7]!;
    expect(allowed).not.toBeNull();
    if (!allowed) return;
    // ANT, APT, ACT are likely in ENABLE-style word lists. Check the fixture.
    // From the fixture there's "ANT" (3-letter). Verify N is allowed.
    expect(allowed.has("N")).toBe(true);
    // A "Z" makes "AZT" which is not a word in fixture.
    expect(allowed.has("Z")).toBe(false);
  });

  it("ALL_LETTERS is the 26-letter alphabet", () => {
    expect(ALL_LETTERS).toHaveLength(26);
    expect(ALL_LETTERS[0]).toBe("A");
    expect(ALL_LETTERS[25]).toBe("Z");
  });
});
