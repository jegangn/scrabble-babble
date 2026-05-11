import { describe, expect, it } from "vitest";
import { createPrng } from "../prng.js";

describe("createPrng", () => {
  it("is deterministic for a given seed", () => {
    const a = createPrng(123);
    const b = createPrng(123);
    const aValues = Array.from({ length: 10 }, () => a.next());
    const bValues = Array.from({ length: 10 }, () => b.next());
    expect(aValues).toEqual(bValues);
  });

  it("produces different sequences for different seeds", () => {
    const a = createPrng(1);
    const b = createPrng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it("next() returns values in [0, 1)", () => {
    const prng = createPrng(7);
    for (let i = 0; i < 1000; i++) {
      const v = prng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("nextInt returns values in [0, max)", () => {
    const prng = createPrng(99);
    for (let i = 0; i < 1000; i++) {
      const v = prng.nextInt(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("nextInt throws on non-positive integer", () => {
    const prng = createPrng(1);
    expect(() => prng.nextInt(0)).toThrow();
    expect(() => prng.nextInt(-1)).toThrow();
    expect(() => prng.nextInt(1.5)).toThrow();
  });

  it("shuffle returns a permutation and does not mutate input", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const original = input.slice();
    const prng = createPrng(42);
    const out = prng.shuffle(input);
    expect(input).toEqual(original);
    expect(out.slice().sort((a, b) => a - b)).toEqual(original);
    expect(out.length).toBe(input.length);
  });

  it("shuffle is deterministic for a given seed", () => {
    const input = [1, 2, 3, 4, 5];
    const a = createPrng(11).shuffle(input);
    const b = createPrng(11).shuffle(input);
    expect(a).toEqual(b);
  });

  it("shuffle handles empty and single-element arrays", () => {
    const prng = createPrng(5);
    expect(prng.shuffle([])).toEqual([]);
    expect(prng.shuffle([42])).toEqual([42]);
  });
});
