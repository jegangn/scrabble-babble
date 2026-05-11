import type { Letter, Rack } from "../types.js";

/**
 * Per-letter leave value. Larger = more desirable to keep in rack.
 *
 * Hand-tuned, loosely inspired by Quackle's published static-leave values:
 * common vowels and "S" / blank are valued; high-pip tiles that are hard
 * to place (Q, X, V, W) are penalised.
 */
const TILE_VALUE: Record<Letter | "_", number> = {
  A: 1.2,
  B: -0.6,
  C: -0.4,
  D: 0.1,
  E: 2.0,
  F: -0.8,
  G: -0.5,
  H: 0.3,
  I: 0.8,
  J: -2.5,
  K: -0.7,
  L: 0.5,
  M: -0.3,
  N: 1.0,
  O: 0.6,
  P: -0.5,
  Q: -6.0,
  R: 1.2,
  S: 4.5,
  T: 1.0,
  U: -1.5,
  V: -2.0,
  W: -2.0,
  X: -1.0,
  Y: -0.5,
  Z: -1.0,
  _: 12.0,
};

const VOWELS = new Set<Letter>(["A", "E", "I", "O", "U"]);

/**
 * Estimate the value of a rack of remaining tiles after a move. Used by the
 * Hard bot to prefer plays that leave behind good follow-up letters.
 *
 * Scoring components:
 * - Sum of per-letter `TILE_VALUE` (vowel-balanced, S/blank favoured).
 * - Penalty for all-vowel or all-consonant racks.
 * - Mild penalty for duplicate uncommon letters (e.g. two U's).
 */
export function leaveValue(rack: Rack): number {
  if (rack.length === 0) return 0;
  let sum = 0;
  let vowels = 0;
  let consonants = 0;
  const counts = new Map<string, number>();
  for (const tile of rack) {
    const key: Letter | "_" = tile.kind === "blank" ? "_" : tile.letter;
    sum += TILE_VALUE[key];
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (tile.kind === "letter") {
      if (VOWELS.has(tile.letter)) vowels++;
      else consonants++;
    }
  }
  if (vowels === 0 && consonants > 0) sum -= 4;
  if (consonants === 0 && vowels > 0) sum -= 4;
  for (const [, count] of counts) {
    if (count > 1) sum -= (count - 1) * 0.5;
  }
  return sum;
}
