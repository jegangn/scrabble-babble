import type { Prng } from "./prng.js";
import type { Tile, TileBag, TileDistribution } from "./types.js";

/**
 * Build a bag of tiles from a distribution, shuffled by the given PRNG.
 *
 * @example
 * const prng = createPrng(42);
 * const bag = createTileBag(CLASSIC_TILES, prng); // 104 tiles, deterministic order
 */
export function createTileBag(distribution: TileDistribution, prng: Prng): TileBag {
  const tiles: Tile[] = [];
  for (const spec of distribution) {
    for (let i = 0; i < spec.count; i++) {
      if (spec.letter === null) {
        tiles.push({ kind: "blank", value: 0 });
      } else {
        tiles.push({ kind: "letter", letter: spec.letter, value: spec.value });
      }
    }
  }
  return prng.shuffle(tiles);
}

/** Result of drawing tiles. */
export interface DrawResult {
  readonly drawn: ReadonlyArray<Tile>;
  readonly remaining: TileBag;
}

/**
 * Draw up to `n` tiles from the front of the bag. If the bag has fewer than
 * `n` tiles, drawn is the whole bag and remaining is empty.
 *
 * Throws if `n` is negative.
 */
export function drawTiles(bag: TileBag, n: number): DrawResult {
  if (n < 0) throw new Error(`drawTiles: n must be ≥ 0, got ${n}`);
  const k = Math.min(n, bag.length);
  return {
    drawn: bag.slice(0, k),
    remaining: bag.slice(k),
  };
}

/**
 * Return tiles to the bag and reshuffle deterministically with the given PRNG.
 * Used by swap moves.
 */
export function returnTiles(bag: TileBag, tiles: ReadonlyArray<Tile>, prng: Prng): TileBag {
  return prng.shuffle([...bag, ...tiles]);
}
