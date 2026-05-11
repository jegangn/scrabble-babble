import type { Letter, TileDistribution } from "../types.js";

/**
 * Classic tile distribution: 104 tiles total, WWF-inspired letter values.
 *
 * Sum verified by `tiles.test.ts`.
 */
export const CLASSIC_TILES: TileDistribution = [
  { letter: "A", count: 9, value: 1 },
  { letter: "B", count: 2, value: 4 },
  { letter: "C", count: 2, value: 4 },
  { letter: "D", count: 5, value: 2 },
  { letter: "E", count: 13, value: 1 },
  { letter: "F", count: 2, value: 4 },
  { letter: "G", count: 3, value: 3 },
  { letter: "H", count: 4, value: 3 },
  { letter: "I", count: 8, value: 1 },
  { letter: "J", count: 1, value: 10 },
  { letter: "K", count: 1, value: 5 },
  { letter: "L", count: 4, value: 2 },
  { letter: "M", count: 2, value: 4 },
  { letter: "N", count: 5, value: 2 },
  { letter: "O", count: 8, value: 1 },
  { letter: "P", count: 2, value: 4 },
  { letter: "Q", count: 1, value: 10 },
  { letter: "R", count: 6, value: 1 },
  { letter: "S", count: 5, value: 1 },
  { letter: "T", count: 7, value: 1 },
  { letter: "U", count: 4, value: 2 },
  { letter: "V", count: 2, value: 5 },
  { letter: "W", count: 2, value: 4 },
  { letter: "X", count: 1, value: 8 },
  { letter: "Y", count: 2, value: 3 },
  { letter: "Z", count: 1, value: 10 },
  { letter: null, count: 2, value: 0 },
];

/** Look up the point value of a letter in the Classic distribution. */
export function letterValue(letter: Letter): number {
  const entry = CLASSIC_TILES.find((t) => t.letter === letter);
  if (!entry) throw new Error(`Unknown letter: ${letter}`);
  return entry.value;
}
