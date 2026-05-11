import { describe, expect, it } from "vitest";
import { CLASSIC_TILES } from "../config/tiles.js";
import { createPrng } from "../prng.js";
import { createTileBag, drawTiles, returnTiles } from "../tilebag.js";

describe("createTileBag", () => {
  it("contains exactly 104 tiles for CLASSIC_TILES", () => {
    const bag = createTileBag(CLASSIC_TILES, createPrng(1));
    expect(bag).toHaveLength(104);
  });

  it("includes both blanks", () => {
    const bag = createTileBag(CLASSIC_TILES, createPrng(1));
    const blanks = bag.filter((t) => t.kind === "blank");
    expect(blanks).toHaveLength(2);
  });

  it("is reproducible for the same seed", () => {
    const a = createTileBag(CLASSIC_TILES, createPrng(99));
    const b = createTileBag(CLASSIC_TILES, createPrng(99));
    expect(a).toEqual(b);
  });

  it("differs across seeds", () => {
    const a = createTileBag(CLASSIC_TILES, createPrng(1));
    const b = createTileBag(CLASSIC_TILES, createPrng(2));
    expect(a).not.toEqual(b);
  });

  it("has exactly 13 E tiles", () => {
    const bag = createTileBag(CLASSIC_TILES, createPrng(7));
    const es = bag.filter((t) => t.kind === "letter" && t.letter === "E");
    expect(es).toHaveLength(13);
  });
});

describe("drawTiles", () => {
  it("draws the requested number of tiles", () => {
    const bag = createTileBag(CLASSIC_TILES, createPrng(5));
    const { drawn, remaining } = drawTiles(bag, 7);
    expect(drawn).toHaveLength(7);
    expect(remaining).toHaveLength(104 - 7);
  });

  it("draws as many as available when bag is shorter than n", () => {
    const bag = createTileBag(CLASSIC_TILES, createPrng(5));
    const { drawn: first } = drawTiles(bag, 100);
    const { drawn: second, remaining } = drawTiles(first, 7);
    expect(second).toHaveLength(7);
    expect(remaining).toHaveLength(93);
  });

  it("returns empty drawn and the same bag when n=0", () => {
    const bag = createTileBag(CLASSIC_TILES, createPrng(5));
    const { drawn, remaining } = drawTiles(bag, 0);
    expect(drawn).toHaveLength(0);
    expect(remaining).toHaveLength(bag.length);
  });

  it("throws on negative n", () => {
    const bag = createTileBag(CLASSIC_TILES, createPrng(5));
    expect(() => drawTiles(bag, -1)).toThrow();
  });

  it("draws everything when n exceeds bag size", () => {
    const bag = createTileBag(CLASSIC_TILES, createPrng(5));
    const { drawn, remaining } = drawTiles(bag, 1000);
    expect(drawn).toHaveLength(104);
    expect(remaining).toHaveLength(0);
  });
});

describe("returnTiles", () => {
  it("grows the bag by the returned amount", () => {
    const bag = createTileBag(CLASSIC_TILES, createPrng(5));
    const { drawn, remaining } = drawTiles(bag, 7);
    const restored = returnTiles(remaining, drawn, createPrng(11));
    expect(restored).toHaveLength(104);
  });

  it("is reshuffled deterministically by the PRNG", () => {
    const bag = createTileBag(CLASSIC_TILES, createPrng(5));
    const { drawn, remaining } = drawTiles(bag, 5);
    const a = returnTiles(remaining, drawn, createPrng(23));
    const b = returnTiles(remaining, drawn, createPrng(23));
    expect(a).toEqual(b);
  });

  it("preserves total tile counts after a draw-return cycle", () => {
    const bag = createTileBag(CLASSIC_TILES, createPrng(5));
    const { drawn, remaining } = drawTiles(bag, 10);
    const restored = returnTiles(remaining, drawn, createPrng(31));
    const aLetters = bag
      .map((t) => (t.kind === "letter" ? t.letter : "_"))
      .sort()
      .join("");
    const bLetters = restored
      .map((t) => (t.kind === "letter" ? t.letter : "_"))
      .sort()
      .join("");
    expect(aLetters).toBe(bLetters);
  });
});
