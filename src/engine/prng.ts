/**
 * Seeded pseudo-random number generator (mulberry32).
 *
 * Reproducibility is non-negotiable for replayable games and test determinism.
 * Never use `Math.random()` anywhere in the engine.
 */

/** A seeded PRNG. Calling any method advances internal state. */
export interface Prng {
  /** Next float in [0, 1). */
  next(): number;
  /** Next integer in [0, maxExclusive). Throws if maxExclusive ≤ 0. */
  nextInt(maxExclusive: number): number;
  /** Fisher–Yates shuffle. Returns a new array; the input is not mutated. */
  shuffle<T>(items: ReadonlyArray<T>): T[];
}

/**
 * Create a PRNG seeded by a 32-bit unsigned integer.
 *
 * @example
 * const prng = createPrng(42);
 * const x = prng.next();        // deterministic float in [0,1)
 * const i = prng.nextInt(10);   // deterministic int in [0,10)
 */
export function createPrng(seed: number): Prng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const nextInt = (maxExclusive: number): number => {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error(`nextInt requires positive integer, got ${maxExclusive}`);
    }
    return Math.floor(next() * maxExclusive);
  };

  const shuffle = <T>(items: ReadonlyArray<T>): T[] => {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = nextInt(i + 1);
      const a = out[i] as T;
      const b = out[j] as T;
      out[i] = b;
      out[j] = a;
    }
    return out;
  };

  return { next, nextInt, shuffle };
}
