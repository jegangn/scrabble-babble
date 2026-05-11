import { describe, expect, it } from "vitest";
import type { Tile } from "../../types.js";
import { leaveValue } from "../leave-eval.js";

const T = (l: string): Tile => ({ kind: "letter", letter: l as "A", value: 1 });
const BLANK: Tile = { kind: "blank", value: 0 };

describe("leaveValue", () => {
  it("returns 0 for empty rack", () => {
    expect(leaveValue([])).toBe(0);
  });

  it("values blanks much more than Q", () => {
    const withBlanks = leaveValue([BLANK, BLANK]);
    const withQs = leaveValue([T("Q"), T("Q")]);
    expect(withBlanks).toBeGreaterThan(withQs);
  });

  it("penalises all-consonant rack", () => {
    const balanced = leaveValue([T("R"), T("A"), T("T"), T("E"), T("S")]);
    const allCons = leaveValue([T("R"), T("T"), T("S"), T("D"), T("L")]);
    expect(balanced).toBeGreaterThan(allCons);
  });

  it("penalises all-vowel rack", () => {
    const balanced = leaveValue([T("A"), T("T"), T("E"), T("R")]);
    const allVowels = leaveValue([T("A"), T("E"), T("I"), T("O"), T("U")]);
    expect(balanced).toBeGreaterThan(allVowels);
  });

  it("prefers keeping S over keeping V", () => {
    expect(leaveValue([T("S")])).toBeGreaterThan(leaveValue([T("V")]));
  });
});
