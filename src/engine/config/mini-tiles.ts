import type { Letter, TileDistribution } from "../types.js";

/**
 * Mini tile distribution: 60 tiles total, same letter values as Classic.
 *
 * Derived by halving Classic's 104 tiles, rounding vowels and connective
 * consonants up to preserve a playable vowel:consonant ratio (~41%), and
 * keeping every letter present (Q/J/X/Z stay at 1 each). One blank instead of two.
 *
 * Sum verified by `mini-tiles.test.ts`.
 */
export const MINI_TILES: TileDistribution = [
  { letter: "A", count: 6, value: 1 },
  { letter: "B", count: 1, value: 4 },
  { letter: "C", count: 1, value: 4 },
  { letter: "D", count: 3, value: 2 },
  { letter: "E", count: 8, value: 1 },
  { letter: "F", count: 1, value: 4 },
  { letter: "G", count: 2, value: 3 },
  { letter: "H", count: 2, value: 3 },
  { letter: "I", count: 4, value: 1 },
  { letter: "J", count: 1, value: 10 },
  { letter: "K", count: 1, value: 5 },
  { letter: "L", count: 2, value: 2 },
  { letter: "M", count: 1, value: 4 },
  { letter: "N", count: 3, value: 2 },
  { letter: "O", count: 4, value: 1 },
  { letter: "P", count: 1, value: 4 },
  { letter: "Q", count: 1, value: 10 },
  { letter: "R", count: 3, value: 1 },
  { letter: "S", count: 3, value: 1 },
  { letter: "T", count: 4, value: 1 },
  { letter: "U", count: 2, value: 2 },
  { letter: "V", count: 1, value: 5 },
  { letter: "W", count: 1, value: 4 },
  { letter: "X", count: 1, value: 8 },
  { letter: "Y", count: 1, value: 3 },
  { letter: "Z", count: 1, value: 10 },
  { letter: null, count: 1, value: 0 },
];

const VOWELS = new Set<Letter>(["A", "E", "I", "O", "U"]);

/** Total number of tiles in the Mini bag. */
export function miniTileCount(): number {
  return MINI_TILES.reduce((acc, spec) => acc + spec.count, 0);
}

/** Number of vowel tiles in the Mini bag (excludes blanks). */
export function miniVowelCount(): number {
  return MINI_TILES.filter(
    (spec) => spec.letter !== null && VOWELS.has(spec.letter),
  ).reduce((acc, spec) => acc + spec.count, 0);
}
