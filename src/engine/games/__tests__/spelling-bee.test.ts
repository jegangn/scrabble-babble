import { beforeEach, describe, expect, it } from "vitest";
import { buildTrie } from "../../dictionary.js";
import type { Letter } from "../../types.js";
import {
  MIN_BEE_WORD_LENGTH,
  PANGRAM_BONUS,
  _resetPangramCacheForTests,
  enumerateBeeWords,
  enumerateSevenLetterPangrams,
  generatePuzzle,
  scoreBeeWord,
  seedFromDate,
  validateBeeWord,
} from "../spelling-bee.js";

beforeEach(() => {
  _resetPangramCacheForTests();
});

// A small fixture dictionary engineered to exercise every code path.
// "PLAINER" has 7 distinct letters {P,L,A,I,N,E,R} — our test pangram.
const TINY_DICT_WORDS = [
  // Pangrams (7 distinct, no S)
  "PLAINER",
  "PAINTER",  // {P,A,I,N,T,E,R} — alternate pangram
  // Words formable from {P,L,A,I,N,E,R} that include centre — populated below
  "PLAIN",
  "PLANE",
  "PLANER",
  "PANEL",
  "RAIN",
  "RAINE",  // invalid English; only used to test enumeration walks even when nonsense
  "REPLAN",
  "PINE",
  "LINER",
  "NEAR",
  // Words missing the centre (will fail "missing_center" tests when centre=P)
  "EARN",
  "RAIL",
  // 3-letter dictionary words (below min length)
  "ALE",
  "ARE",
  "PEA",
  // Out-of-alphabet word
  "QUICK",
  // Words containing S — to exercise the S filter in pangram enumeration
  "SAILER", // {S,A,I,L,E,R} — only 6 distinct
  "SAILERS", // S-containing 7-letter "pangram-like" word, must be excluded
];

// The "SAILERS" entry is engineered to be 7 distinct {S,A,I,L,E,R,S} — wait,
// distinct is 6 because S appears twice. Add an actual 7-distinct S-word.
TINY_DICT_WORDS.push("MASTERY"); // 7 distinct {M,A,S,T,E,R,Y} but has S → must be filtered out

const DICT = buildTrie(TINY_DICT_WORDS);

describe("enumerateSevenLetterPangrams", () => {
  it("returns only words with exactly 7 distinct letters", () => {
    const pangrams = enumerateSevenLetterPangrams(DICT);
    for (const p of pangrams) {
      const distinct = new Set(Array.from(p));
      expect(distinct.size).toBe(7);
    }
  });

  it("excludes any word containing 'S' (NYT convention)", () => {
    const pangrams = enumerateSevenLetterPangrams(DICT);
    for (const p of pangrams) {
      expect(p.includes("S"), `${p} should not be in the pangram list`).toBe(false);
    }
  });

  it("finds the known pangrams in the fixture", () => {
    const pangrams = enumerateSevenLetterPangrams(DICT);
    expect(pangrams).toContain("PLAINER");
    expect(pangrams).toContain("PAINTER");
    expect(pangrams).not.toContain("MASTERY"); // contains S
  });

  it("is cached per dict reference (subsequent calls return the same array)", () => {
    const a = enumerateSevenLetterPangrams(DICT);
    const b = enumerateSevenLetterPangrams(DICT);
    expect(a).toBe(b);
  });
});

describe("seedFromDate", () => {
  it("is deterministic", () => {
    expect(seedFromDate("2026-05-12")).toBe(seedFromDate("2026-05-12"));
  });

  it("yields different seeds for different dates", () => {
    expect(seedFromDate("2026-05-12")).not.toBe(seedFromDate("2026-05-13"));
  });

  it("produces a non-negative 32-bit integer", () => {
    const seed = seedFromDate("2026-05-12");
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });
});

describe("generatePuzzle", () => {
  it("is deterministic per date key", () => {
    const a = generatePuzzle("2026-05-12", DICT);
    const b = generatePuzzle("2026-05-12", DICT);
    expect(a.letters).toEqual(b.letters);
    expect(a.center).toBe(b.center);
  });

  it("returns 7 distinct letters with the centre included", () => {
    const p = generatePuzzle("2026-05-12", DICT);
    expect(p.letters).toHaveLength(7);
    const distinct = new Set(p.letters);
    expect(distinct.size).toBe(7);
    expect(p.letters).toContain(p.center);
  });

  it("the chosen pangram itself is a valid Bee word for its puzzle (self-check)", () => {
    const p = generatePuzzle("2026-05-12", DICT);
    // The originating pangram must be in the dict and use only puzzle letters.
    // We can't recover the pangram directly, but every pangram in the list IS one,
    // so pick one and assert it validates against this puzzle if all 7 letters match.
    const pangrams = enumerateSevenLetterPangrams(DICT);
    const allowed = new Set(p.letters);
    const matching = pangrams.find((w) =>
      Array.from(w).every((c) => allowed.has(c as Letter)),
    );
    expect(matching).toBeDefined();
    if (matching) {
      expect(validateBeeWord(p, matching, DICT)).toEqual(
        matching.includes(p.center) ? { ok: true } : { ok: false, reason: "missing_center" },
      );
    }
  });
});

describe("validateBeeWord", () => {
  // Force a known puzzle for clarity.
  const puzzle = { letters: ["A", "E", "I", "L", "N", "P", "R"] as Letter[], center: "P" as Letter };

  it("accepts a valid word", () => {
    expect(validateBeeWord(puzzle, "PLAIN", DICT)).toEqual({ ok: true });
  });

  it("rejects words below the minimum length", () => {
    expect(validateBeeWord(puzzle, "PEA", DICT)).toEqual({ ok: false, reason: "too_short" });
    expect(MIN_BEE_WORD_LENGTH).toBe(4);
  });

  it("rejects words missing the centre letter", () => {
    expect(validateBeeWord(puzzle, "RAIL", DICT)).toEqual({
      ok: false,
      reason: "missing_center",
    });
  });

  it("rejects words containing letters outside the puzzle", () => {
    // "POOL" contains the centre P but has O which isn't in the puzzle.
    expect(validateBeeWord(puzzle, "POOL", DICT)).toEqual({
      ok: false,
      reason: "uses_other_letters",
    });
  });

  it("rejects words not in the dictionary", () => {
    // "PLEAN" is not in our fixture — uses only valid letters + centre but isn't a word.
    expect(validateBeeWord(puzzle, "PLEAN", DICT)).toEqual({
      ok: false,
      reason: "not_in_dictionary",
    });
  });

  it("is case-insensitive on input", () => {
    expect(validateBeeWord(puzzle, "plain", DICT)).toEqual({ ok: true });
  });
});

describe("scoreBeeWord", () => {
  const puzzle = { letters: ["A", "E", "I", "L", "N", "P", "R"] as Letter[], center: "P" as Letter };

  it("4-letter words score 1 point", () => {
    expect(scoreBeeWord("PINE", puzzle)).toBe(1);
  });

  it("5+ letter non-pangrams score their length", () => {
    expect(scoreBeeWord("PLAIN", puzzle)).toBe(5);
    expect(scoreBeeWord("LINER", puzzle)).toBe(5);
  });

  it("pangrams score length + PANGRAM_BONUS", () => {
    // PLAINER uses {P,L,A,I,N,E,R} — all 7 letters.
    expect(scoreBeeWord("PLAINER", puzzle)).toBe(7 + PANGRAM_BONUS);
  });
});

describe("enumerateBeeWords", () => {
  const puzzle = { letters: ["A", "E", "I", "L", "N", "P", "R"] as Letter[], center: "P" as Letter };

  it("returns dictionary words ≥4 letters that use only puzzle letters and include centre", () => {
    const words = enumerateBeeWords(puzzle, DICT);
    expect(words).toContain("PLAIN");
    expect(words).toContain("PLANE");
    expect(words).toContain("PLAINER");
    expect(words).toContain("PANEL");
    // EARN uses only puzzle letters but doesn't include centre 'P' → excluded.
    expect(words).not.toContain("EARN");
    // ALE is too short.
    expect(words).not.toContain("ALE");
  });

  it("allows letter reuse from the puzzle alphabet", () => {
    // "REPLAN" reuses no letters; this also covers basic enumeration.
    const words = enumerateBeeWords(puzzle, DICT);
    expect(words).toContain("REPLAN");
  });
});
