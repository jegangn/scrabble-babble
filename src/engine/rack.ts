import { drawTiles } from "./tilebag.js";
import type { PlacedTile, Rack, Tile, TileBag } from "./types.js";

/**
 * Whether two rack tiles are interchangeable (same kind; same letter if letter).
 * A blank in the rack matches any other blank — its letter is only chosen at placement.
 */
export function tilesAreEquivalent(a: Tile, b: Tile): boolean {
  if (a.kind === "blank" && b.kind === "blank") return true;
  if (a.kind === "letter" && b.kind === "letter") return a.letter === b.letter;
  return false;
}

/**
 * Convert a placed tile (which may carry a chosen-letter for a blank) into its
 * equivalent rack tile (which never does).
 */
export function placedToRackTile(p: PlacedTile): Tile {
  if (p.kind === "blank") return { kind: "blank", value: 0 };
  return { kind: "letter", letter: p.letter, value: p.value };
}

/**
 * Remove one occurrence per requested tile from the rack. Multiset semantics.
 * Returns the new rack, or `null` if any tile is missing.
 *
 * @example
 * removeFromRack([{kind:"letter",letter:"A",value:1}], [{kind:"letter",letter:"A",value:1}])
 *   // → []
 */
export function removeFromRack(rack: Rack, toRemove: ReadonlyArray<Tile>): Rack | null {
  const remaining: Tile[] = rack.slice();
  for (const tile of toRemove) {
    const idx = remaining.findIndex((r) => tilesAreEquivalent(r, tile));
    if (idx === -1) return null;
    remaining.splice(idx, 1);
  }
  return remaining;
}

/** Whether the rack contains every requested tile (multiset-aware). */
export function rackContains(rack: Rack, required: ReadonlyArray<Tile>): boolean {
  return removeFromRack(rack, required) !== null;
}

/** Result of {@link refillRack}. */
export interface RefillResult {
  readonly rack: Rack;
  readonly bag: TileBag;
}

/**
 * Top up the rack from the bag until it reaches `target` tiles, or until the
 * bag is exhausted. Tiles are drawn from the front of the bag.
 */
export function refillRack(rack: Rack, bag: TileBag, target: number): RefillResult {
  const need = Math.max(0, target - rack.length);
  const { drawn, remaining } = drawTiles(bag, need);
  return { rack: [...rack, ...drawn], bag: remaining };
}
