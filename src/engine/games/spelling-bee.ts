/**
 * Spelling Bee — NYT-style daily word puzzle.
 *
 * Rules: 7 letters arranged as a hex with one mandatory centre letter.
 * Valid words are at least {@link MIN_BEE_WORD_LENGTH} letters long, present
 * in the dictionary, use only the 7 letters (with reuse allowed), AND
 * include the centre letter. A "pangram" uses all 7 letters at least once
 * and earns a {@link PANGRAM_BONUS} bonus on top of its length score.
 *
 * Pure module: no DOM, no storage, no React. The UI lives in
 * `src/ui/screens/SpellingBeeScreen.tsx`.
 */

import type { TrieNode } from "../dictionary.js";
import { lookup } from "../dictionary.js";
import { createPrng } from "../prng.js";
import type { Letter } from "../types.js";

/** Minimum word length accepted by the Bee. NYT uses 4. */
export const MIN_BEE_WORD_LENGTH = 4;

/** Number of letters in a puzzle, including the centre. */
export const BEE_LETTER_COUNT = 7;

/** Extra points awarded for using all 7 letters in a single word. */
export const PANGRAM_BONUS = 7;

/** A Bee puzzle is its 7-letter alphabet plus the mandatory centre. */
export interface BeePuzzle {
  /** All 7 letters, sorted alphabetically for canonical display. */
  readonly letters: ReadonlyArray<Letter>;
  /** The mandatory centre letter; always one of `letters`. */
  readonly center: Letter;
}

const VOWELS: ReadonlySet<Letter> = new Set<Letter>(["A", "E", "I", "O", "U"]);

// ─────────────────────────────────────────────────────────────────────────────
// Pangram enumeration (cached at module scope)
// ─────────────────────────────────────────────────────────────────────────────

let pangramCache: ReadonlyArray<string> | null = null;
let cachedDictRef: TrieNode | null = null;

/**
 * Walk the trie depth-first and return every terminal word that has
 * exactly 7 distinct letters and contains no 'S' (NYT convention — S would
 * let "add S" plurals dominate scoring and trivialize the puzzle).
 *
 * Cached per trie instance: the first call walks the full dictionary
 * (~80-300 ms on the ~279 k CSW21 list), subsequent calls return the
 * cached array. Pass a different `dict` to invalidate the cache.
 */
export function enumerateSevenLetterPangrams(dict: TrieNode): ReadonlyArray<string> {
  if (pangramCache !== null && cachedDictRef === dict) return pangramCache;

  const out: string[] = [];
  const buffer: string[] = [];
  const distinct = new Set<string>();

  function dfs(node: TrieNode): void {
    if (node.terminal && buffer.length >= BEE_LETTER_COUNT) {
      if (distinct.size === BEE_LETTER_COUNT && !distinct.has("S")) {
        out.push(buffer.join(""));
      }
    }
    if (distinct.size > BEE_LETTER_COUNT) return;
    for (const [ch, child] of node.children) {
      const wasNew = !distinct.has(ch);
      if (wasNew) {
        if (distinct.size === BEE_LETTER_COUNT) continue; // would exceed 7
        distinct.add(ch);
      }
      buffer.push(ch);
      dfs(child);
      buffer.pop();
      if (wasNew) distinct.delete(ch);
    }
  }

  dfs(dict);
  pangramCache = out;
  cachedDictRef = dict;
  return out;
}

/** Reset the pangram cache. Exposed for tests. */
export function _resetPangramCacheForTests(): void {
  pangramCache = null;
  cachedDictRef = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily seeding
// ─────────────────────────────────────────────────────────────────────────────

/**
 * djb2-style hash of a date key (e.g. "2026-05-12") to a 32-bit unsigned
 * integer suitable for {@link createPrng}.
 */
export function seedFromDate(dateKey: string): number {
  let hash = 5381 >>> 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (((hash << 5) + hash) ^ dateKey.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Puzzle generation
// ─────────────────────────────────────────────────────────────────────────────

function distinctLetters(word: string): Letter[] {
  const seen = new Set<Letter>();
  const out: Letter[] = [];
  for (const ch of word) {
    const L = ch as Letter;
    if (!seen.has(L)) {
      seen.add(L);
      out.push(L);
    }
  }
  return out;
}

function vowelCount(letters: ReadonlyArray<Letter>): number {
  let n = 0;
  for (const l of letters) if (VOWELS.has(l)) n++;
  return n;
}

/**
 * Generate today's puzzle. Deterministic per `dateKey` so anyone playing
 * on the same local calendar day gets the same letters and centre.
 *
 * Filters candidate pangrams to ones with at least 2 vowels and no Q
 * (Q-without-U produces an unplayable day). If the candidate pool is
 * empty we fall back to the unfiltered list — defensive only.
 */
export function generatePuzzle(dateKey: string, dict: TrieNode): BeePuzzle {
  const all = enumerateSevenLetterPangrams(dict);
  const playable = all.filter((word) => {
    const letters = distinctLetters(word);
    if (letters.includes("Q" as Letter)) return false;
    if (vowelCount(letters) < 2) return false;
    return true;
  });
  const pool = playable.length > 0 ? playable : all;
  if (pool.length === 0) {
    throw new Error("No 7-letter pangrams available in dictionary");
  }
  const prng = createPrng(seedFromDate(dateKey));
  const word = pool[prng.nextInt(pool.length)]!;
  const letters = distinctLetters(word);
  // Sort for canonical display (centre is highlighted separately).
  const sorted = [...letters].sort() as Letter[];
  const center = letters[prng.nextInt(letters.length)]!;
  return { letters: sorted, center };
}

// ─────────────────────────────────────────────────────────────────────────────
// Word validation + scoring
// ─────────────────────────────────────────────────────────────────────────────

/** Reasons a candidate Bee word cannot be accepted. */
export type BeeRejection =
  | "too_short"
  | "missing_center"
  | "uses_other_letters"
  | "not_in_dictionary";

/** Result of validating a candidate word against the puzzle + dictionary. */
export type BeeValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: BeeRejection };

/**
 * Validate a candidate Bee word.
 *
 * Returns `{ ok: true }` if the word is at least {@link MIN_BEE_WORD_LENGTH}
 * letters, uses only puzzle letters (with reuse allowed), includes the
 * centre letter, and is in the dictionary. Caller is responsible for
 * deduplicating against already-found words.
 */
export function validateBeeWord(
  puzzle: BeePuzzle,
  word: string,
  dict: TrieNode,
): BeeValidation {
  const w = word.toUpperCase();
  if (w.length < MIN_BEE_WORD_LENGTH) return { ok: false, reason: "too_short" };
  if (!w.includes(puzzle.center)) return { ok: false, reason: "missing_center" };
  const allowed = new Set<string>(puzzle.letters);
  for (const ch of w) {
    if (!allowed.has(ch)) return { ok: false, reason: "uses_other_letters" };
  }
  if (!lookup(dict, w)) return { ok: false, reason: "not_in_dictionary" };
  return { ok: true };
}

function isPangram(word: string, puzzle: BeePuzzle): boolean {
  const seen = new Set<string>();
  for (const ch of word.toUpperCase()) seen.add(ch);
  return puzzle.letters.every((l) => seen.has(l));
}

/**
 * Score a single Bee word.
 *
 * NYT scoring: a 4-letter word = 1 pt; words of 5+ letters score their
 * length. A pangram earns an additional {@link PANGRAM_BONUS} bonus.
 *
 * Example: WORD = 1; WORDY = 5; ABCDEFG (pangram length 7) = 7 + 7 = 14.
 */
export function scoreBeeWord(word: string, puzzle: BeePuzzle): number {
  const w = word.toUpperCase();
  let base = w.length === MIN_BEE_WORD_LENGTH ? 1 : w.length;
  if (isPangram(w, puzzle)) base += PANGRAM_BONUS;
  return base;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enumerate every valid Bee word for a puzzle (used for the day's totals)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Walk the trie and return every dictionary word that satisfies the
 * puzzle's constraints. Uses letter reuse from the 7-letter alphabet.
 *
 * Returned in ascending length, then alphabetical. Mostly used to compute
 * the day's "you found N of M" denominator.
 */
/**
 * Cap the DFS depth at a realistic Bee answer length. CSW21 tops out at 15
 * letters, well within this. Without this cap the walk
 * recurses to every leaf, producing thousands of pathologically long words
 * and blocking the main thread for hundreds of ms on first paint. 15 covers
 * every common pangram while keeping the walk to a single frame.
 */
const MAX_BEE_WORD_LENGTH = 15;

export function enumerateBeeWords(
  puzzle: BeePuzzle,
  dict: TrieNode,
): ReadonlyArray<string> {
  const allowed = new Set<string>(puzzle.letters);
  const out: string[] = [];
  const buffer: string[] = [];

  function dfs(node: TrieNode): void {
    if (
      node.terminal &&
      buffer.length >= MIN_BEE_WORD_LENGTH &&
      buffer.includes(puzzle.center)
    ) {
      out.push(buffer.join(""));
    }
    if (buffer.length >= MAX_BEE_WORD_LENGTH) return;
    for (const [ch, child] of node.children) {
      if (!allowed.has(ch)) continue;
      buffer.push(ch);
      dfs(child);
      buffer.pop();
    }
  }

  dfs(dict);
  out.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return out;
}
