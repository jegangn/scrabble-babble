/**
 * Tumbler — solo word-finding minigame.
 *
 * Rules: the player gets 7 random letters and 60 seconds to type as many
 * valid words as possible. Each submitted word must be in the dictionary
 * and form-able from the 7 letters (each letter consumed at most as many
 * times as it appears in the rack — a multiset subset check).
 *
 * Per-word score = (Σ letter values) × word length. Total = sum of per-word.
 *
 * This module is pure: no DOM, no storage, no React. The UI lives in
 * `src/ui/screens/TumblerScreen.tsx` and consumes these functions.
 */

import { CLASSIC_TILES, letterValue } from "../config/tiles.js";
import type { TrieNode } from "../dictionary.js";
import { lookup } from "../dictionary.js";
import type { Prng } from "../prng.js";
import { createTileBag } from "../tilebag.js";
import type { Letter } from "../types.js";

/** Minimum word length accepted by Tumbler. 2 keeps short Scrabble words (AA, QI) in play. */
export const MIN_TUMBLER_WORD_LENGTH = 2;

/** Number of letters the player gets at the start of a Tumbler round. */
export const TUMBLER_RACK_SIZE = 7;

/** Round duration in milliseconds. */
export const TUMBLER_DURATION_MS = 60_000;

const VOWELS: ReadonlySet<Letter> = new Set<Letter>(["A", "E", "I", "O", "U"]);
const MIN_VOWELS = 2;
const MAX_VOWELS = 5;
const MAX_DRAW_RETRIES = 20;

function countVowels(letters: ReadonlyArray<Letter>): number {
  let n = 0;
  for (const l of letters) if (VOWELS.has(l)) n++;
  return n;
}

/**
 * Draw {@link TUMBLER_RACK_SIZE} random letters from the Classic bag,
 * skipping blanks. Retries up to {@link MAX_DRAW_RETRIES} times until the
 * draw has between {@link MIN_VOWELS} and {@link MAX_VOWELS} vowels
 * (inclusive). Falls back to the last draw if the cap is hit — guarantees
 * termination on degenerate PRNGs.
 *
 * Determined entirely by `prng`, so tests with the same seed reproduce.
 */
export function drawTumblerLetters(prng: Prng): Letter[] {
  let lastDraw: Letter[] = [];
  for (let attempt = 0; attempt < MAX_DRAW_RETRIES; attempt++) {
    const bag = createTileBag(CLASSIC_TILES, prng);
    const letters: Letter[] = [];
    for (const tile of bag) {
      if (tile.kind === "blank") continue;
      letters.push(tile.letter);
      if (letters.length === TUMBLER_RACK_SIZE) break;
    }
    lastDraw = letters;
    const v = countVowels(letters);
    if (v >= MIN_VOWELS && v <= MAX_VOWELS) return letters;
  }
  return lastDraw;
}

/** Reasons a candidate word cannot be accepted. */
export type TumblerRejection =
  | "too_short"
  | "not_in_dictionary"
  | "letters_not_in_rack";

/** Result of validating a candidate word against the rack + dictionary. */
export type TumblerValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: TumblerRejection };

function multisetContains(
  pool: ReadonlyArray<Letter>,
  needed: ReadonlyArray<Letter>,
): boolean {
  const counts = new Map<Letter, number>();
  for (const l of pool) counts.set(l, (counts.get(l) ?? 0) + 1);
  for (const l of needed) {
    const c = counts.get(l) ?? 0;
    if (c === 0) return false;
    counts.set(l, c - 1);
  }
  return true;
}

/**
 * Validate a candidate Tumbler word.
 *
 * Returns `{ ok: true }` if the word is at least {@link MIN_TUMBLER_WORD_LENGTH}
 * letters, present in the dictionary, and form-able from the rack as a
 * multiset (e.g., rack with one A cannot play AHA).
 *
 * The word is normalised to upper case before checking. Caller is
 * responsible for deduplicating against already-found words.
 */
export function validateTumblerWord(
  rack: ReadonlyArray<Letter>,
  word: string,
  dict: TrieNode,
): TumblerValidation {
  const w = word.toUpperCase();
  if (w.length < MIN_TUMBLER_WORD_LENGTH) {
    return { ok: false, reason: "too_short" };
  }
  if (!lookup(dict, w)) {
    return { ok: false, reason: "not_in_dictionary" };
  }
  const needed = Array.from(w) as Letter[];
  if (!multisetContains(rack, needed)) {
    return { ok: false, reason: "letters_not_in_rack" };
  }
  return { ok: true };
}

/**
 * Enumerate every dictionary word (length >= MIN_TUMBLER_WORD_LENGTH) that
 * can be formed from `rack` as a multiset — each tile used at most as many
 * times as it appears in the rack. Pure DFS over the trie; bounded by the
 * rack (<= 7 distinct letters, depth <= 7), so a few thousand ops worst case.
 *
 * Returns uppercase words in trie-DFS order (deterministic); callers sort.
 * No duplicates (trie paths are unique).
 */
export function enumerateTumblerWords(
  rack: ReadonlyArray<Letter>,
  dict: TrieNode,
): string[] {
  const remaining = new Map<string, number>();
  for (const l of rack) remaining.set(l, (remaining.get(l) ?? 0) + 1);

  const results: string[] = [];
  const path: string[] = [];

  const walk = (node: TrieNode): void => {
    if (node.terminal && path.length >= MIN_TUMBLER_WORD_LENGTH) {
      results.push(path.join(""));
    }
    for (const [letter, child] of node.children) {
      const left = remaining.get(letter) ?? 0;
      if (left <= 0) continue;
      remaining.set(letter, left - 1);
      path.push(letter);
      walk(child);
      path.pop();
      remaining.set(letter, left);
    }
  };

  walk(dict);
  return results;
}

/**
 * Score a single Tumbler word.
 *
 * Formula: `(sum of letter values) × word length`.
 *
 * Example: CAT = (4 + 1 + 1) × 3 = 18. QI = (10 + 1) × 2 = 22.
 *
 * Equivalent to `Σ(value × length)` per letter — the two are mathematically
 * identical. Documented this way to match the project spec.
 */
export function scoreTumblerWord(word: string): number {
  const w = word.toUpperCase();
  let sum = 0;
  for (const ch of w) sum += letterValue(ch as Letter);
  return sum * w.length;
}
