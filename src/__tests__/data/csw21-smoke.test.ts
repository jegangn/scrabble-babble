import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { buildTrie, lookup } from "../../engine/dictionary.js";

/**
 * Smoke test for the shipped CSW21 wordlist (`public/csw21.txt.gz`).
 *
 * Unlike the fixture-based dictionary tests, this loads the real ~279k-word
 * file from disk, builds the production trie, and asserts a handful of
 * sentinel words + the overall count. Guards against a corrupted / truncated
 * regenerate, a stale ENABLE file, or a normalisation regression in
 * `scripts/fetch-csw21.mjs`.
 */
function loadGzippedWords(relativeToThisFile: string): string[] {
  const buf = readFileSync(new URL(relativeToThisFile, import.meta.url));
  return gunzipSync(buf)
    .toString("utf8")
    .split("\n")
    .filter((w) => w.length > 0);
}

describe("CSW21 wordlist (shipped asset)", () => {
  const words = loadGzippedWords("../../../public/csw21.txt.gz");
  const trie = buildTrie(words);

  it("has a CSW21-sized word count (275k–285k)", () => {
    expect(words.length).toBeGreaterThanOrEqual(275_000);
    expect(words.length).toBeLessThanOrEqual(285_000);
  });

  it("validates words that are valid in CSW21", () => {
    for (const word of [
      "QI", "ZA", "FE", "CWM", "BRR", "ZUZ", "SELFIE", "EMOJI", "COSPLAY", "QADI",
    ]) {
      expect(lookup(trie, word), `${word} should be valid`).toBe(true);
    }
  });

  it("rejects non-words, empty, and whitespace", () => {
    for (const junk of ["QQ", "XYZAB", "ASDFGH", "", "  "]) {
      expect(lookup(trie, junk), `${JSON.stringify(junk)} should be invalid`).toBe(false);
    }
  });

  it("still contains common words (CSW21 ⊇ everyday English)", () => {
    for (const word of [
      "HELLO", "FRIEND", "COMPUTER", "ORANGE", "QUARTZ", "JUKEBOX", "RHYTHM", "ZEBRA",
    ]) {
      expect(lookup(trie, word), `${word} should be valid`).toBe(true);
    }
  });
});
