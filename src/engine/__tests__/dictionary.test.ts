import { describe, expect, it } from "vitest";
import { buildTrie, hasPrefix, lookup } from "../dictionary.js";
import { FIXTURE_WORDS } from "../__fixtures__/dictionary-subset.js";

describe("buildTrie + lookup", () => {
  const trie = buildTrie(FIXTURE_WORDS);

  it("recognises a common 3-letter word", () => {
    expect(lookup(trie, "CAT")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(lookup(trie, "cat")).toBe(true);
    expect(lookup(trie, "Cat")).toBe(true);
  });

  it("rejects unknown words", () => {
    expect(lookup(trie, "ZXQVT")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(lookup(trie, "")).toBe(false);
  });

  it("rejects a prefix that is not itself a word", () => {
    // "AB" — if not in fixture as a word, only as a prefix of ABLE etc.
    expect(lookup(trie, "AB")).toBe(false);
  });
});

describe("hasPrefix", () => {
  const trie = buildTrie(FIXTURE_WORDS);

  it("accepts a known prefix", () => {
    expect(hasPrefix(trie, "CA")).toBe(true);
  });

  it("accepts empty prefix", () => {
    expect(hasPrefix(trie, "")).toBe(true);
  });

  it("rejects an impossible prefix", () => {
    expect(hasPrefix(trie, "ZX")).toBe(false);
  });
});

describe("buildTrie edge cases", () => {
  it("ignores empty words", () => {
    const trie = buildTrie([""]);
    expect(lookup(trie, "")).toBe(false);
  });

  it("builds an empty trie from no words", () => {
    const trie = buildTrie([]);
    expect(lookup(trie, "ANY")).toBe(false);
    expect(hasPrefix(trie, "")).toBe(true);
  });

  it("handles duplicates", () => {
    const trie = buildTrie(["DOG", "DOG", "DOG"]);
    expect(lookup(trie, "DOG")).toBe(true);
  });
});
