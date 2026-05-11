import { describe, expect, it } from "vitest";
import { createEmptyBoard } from "../board.js";
import { CLASSIC_BOARD } from "../config/board.js";
import { renderBoard } from "../debug.js";
import { boardWith, PT } from "./helpers.js";

describe("renderBoard", () => {
  it("renders an empty board with TW markers at the corners", () => {
    const out = renderBoard(createEmptyBoard(CLASSIC_BOARD));
    expect(out).toContain("TW");
  });

  it("renders the starting star at center on an empty board", () => {
    const out = renderBoard(createEmptyBoard(CLASSIC_BOARD));
    expect(out).toContain("★");
  });

  it("renders placed tiles as uppercase letters", () => {
    const board = boardWith([
      { position: { row: 7, col: 6 }, tile: PT("C", 4) },
      { position: { row: 7, col: 7 }, tile: PT("A", 1) },
      { position: { row: 7, col: 8 }, tile: PT("T", 1) },
    ]);
    const out = renderBoard(board);
    expect(out).toContain(" C ");
    expect(out).toContain(" A ");
    expect(out).toContain(" T ");
  });

  it("includes column and row indices", () => {
    const out = renderBoard(createEmptyBoard(CLASSIC_BOARD));
    // The header line has 0, 1, 2, ... separated by spaces.
    expect(out.split("\n")[0]).toMatch(/0\s+1\s+2/);
  });
});
