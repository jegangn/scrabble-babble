import { describe, expect, it } from "vitest";
import { FIXTURE_WORDS } from "../../__fixtures__/dictionary-subset.js";
import { buildTrie } from "../../dictionary.js";
import { createPrng } from "../../prng.js";
import type { Letter } from "../../types.js";
import {
  MIN_TUMBLER_WORD_LENGTH,
  TUMBLER_RACK_SIZE,
  drawTumblerLetters,
  scoreTumblerWord,
  validateTumblerWord,
} from "../tumbler.js";

const DICT = buildTrie(FIXTURE_WORDS);

describe("drawTumblerLetters", () => {
  it("returns exactly TUMBLER_RACK_SIZE letters", () => {
    const letters = drawTumblerLetters(createPrng(1));
    expect(letters).toHaveLength(TUMBLER_RACK_SIZE);
  });

  it("never includes a blank letter (kind === 'blank' would be undefined)", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const letters = drawTumblerLetters(createPrng(seed));
      for (const l of letters) {
        expect(typeof l).toBe("string");
        expect(l).toMatch(/^[A-Z]$/);
      }
    }
  });

  it("draws fall within the 2-5 vowel bounds across 100 seeds", () => {
    const VOWELS = new Set<Letter>(["A", "E", "I", "O", "U"]);
    for (let seed = 1; seed <= 100; seed++) {
      const letters = drawTumblerLetters(createPrng(seed));
      const vowels = letters.filter((l) => VOWELS.has(l)).length;
      // Cap-fallback can leave us slightly outside but that's the documented
      // fallback. In practice we should never see it for these seeds.
      expect(vowels, `seed=${seed}`).toBeGreaterThanOrEqual(2);
      expect(vowels, `seed=${seed}`).toBeLessThanOrEqual(5);
    }
  });

  it("same seed reproduces the same draw", () => {
    const a = drawTumblerLetters(createPrng(42));
    const b = drawTumblerLetters(createPrng(42));
    expect(a).toEqual(b);
  });
});

describe("scoreTumblerWord", () => {
  it("CAT = (4 + 1 + 1) × 3 = 18", () => {
    expect(scoreTumblerWord("CAT")).toBe(18);
  });

  it("QI = (10 + 1) × 2 = 22", () => {
    expect(scoreTumblerWord("QI")).toBe(22);
  });

  it("is case-insensitive", () => {
    expect(scoreTumblerWord("cat")).toBe(scoreTumblerWord("CAT"));
  });

  it("scales as length × Σ value (mathematical identity)", () => {
    // "RETAIN" = R(1)+E(1)+T(1)+A(1)+I(1)+N(2) = 7; × 6 = 42.
    expect(scoreTumblerWord("RETAIN")).toBe(42);
  });
});

describe("validateTumblerWord", () => {
  const rack: Letter[] = ["C", "A", "T", "S", "R", "E", "N"];

  it("accepts a valid word formable from the rack", () => {
    expect(validateTumblerWord(rack, "CAT", DICT)).toEqual({ ok: true });
    expect(validateTumblerWord(rack, "CATS", DICT)).toEqual({ ok: true });
    expect(validateTumblerWord(rack, "EARN", DICT)).toEqual({ ok: true });
  });

  it("rejects words below the minimum length", () => {
    const result = validateTumblerWord(rack, "A", DICT);
    expect(result).toEqual({ ok: false, reason: "too_short" });
    expect(MIN_TUMBLER_WORD_LENGTH).toBe(2);
  });

  it("rejects words not in the dictionary", () => {
    const result = validateTumblerWord(rack, "XYZ", DICT);
    expect(result).toEqual({ ok: false, reason: "not_in_dictionary" });
  });

  it("rejects words whose letters aren't in the rack (multiset check)", () => {
    // Rack has one E; EYE needs two E's even though it's a real word.
    const oneE: Letter[] = ["E", "Y", "T", "S", "R", "A", "N"];
    const result = validateTumblerWord(oneE, "EYE", DICT);
    expect(result).toEqual({ ok: false, reason: "letters_not_in_rack" });
  });

  it("is case-insensitive on input", () => {
    expect(validateTumblerWord(rack, "cat", DICT)).toEqual({ ok: true });
  });
});
