import { expect } from "vitest";
import type { BoardConfig, PremiumType } from "../../types.js";

/** Per-premium-type cell counts on a board. */
export interface PremiumCounts {
  readonly TW: number;
  readonly DW: number;
  readonly TL: number;
  readonly DL: number;
  readonly NONE: number;
}

/** Optional layout invariants beyond the counts + symmetry baseline. */
export interface SymmetryOptions {
  /** What the center cell must be (default: "DW"). */
  readonly centerPremium?: PremiumType;
  /** If provided, all four corners must equal this premium type. */
  readonly cornerPremium?: PremiumType;
}

/**
 * Assert that `board` is 4-fold rotationally symmetric, matches the expected
 * per-premium counts, has the right center premium, and (optionally) the same
 * premium on every corner.
 *
 * Reused by `symmetry.test.ts` (Classic), `mini-board.test.ts` (Mini), and
 * `random-board.test.ts` (per-seed property check).
 */
export function verifySymmetric(
  board: BoardConfig,
  expected: PremiumCounts,
  opts: SymmetryOptions = {},
): void {
  const { size, premiums } = board;
  const center = Math.floor(size / 2);
  const centerPremium = opts.centerPremium ?? "DW";

  // Shape
  expect(premiums).toHaveLength(size);
  for (const row of premiums) expect(row).toHaveLength(size);

  // Center
  expect(premiums[center]![center]).toBe(centerPremium);

  // 4-fold rotational symmetry: (r, c) ≡ (c, size-1-r).
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const rotated = premiums[c]![size - 1 - r]!;
      expect(rotated).toBe(premiums[r]![c]!);
    }
  }

  // Counts
  const counts: Record<PremiumType, number> = { NONE: 0, DL: 0, TL: 0, DW: 0, TW: 0 };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      counts[premiums[r]![c]!]++;
    }
  }
  expect(counts.TW).toBe(expected.TW);
  expect(counts.DW).toBe(expected.DW);
  expect(counts.TL).toBe(expected.TL);
  expect(counts.DL).toBe(expected.DL);
  expect(counts.NONE).toBe(expected.NONE);

  // Corners (optional)
  if (opts.cornerPremium) {
    const last = size - 1;
    expect(premiums[0]![0]).toBe(opts.cornerPremium);
    expect(premiums[0]![last]).toBe(opts.cornerPremium);
    expect(premiums[last]![0]).toBe(opts.cornerPremium);
    expect(premiums[last]![last]).toBe(opts.cornerPremium);
  }
}
