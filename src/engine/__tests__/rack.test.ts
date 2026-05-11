import { describe, expect, it } from "vitest";
import {
  placedToRackTile,
  rackContains,
  refillRack,
  removeFromRack,
  tilesAreEquivalent,
} from "../rack.js";
import type { PlacedTile, Rack, Tile, TileBag } from "../types.js";

const A: Tile = { kind: "letter", letter: "A", value: 1 };
const B: Tile = { kind: "letter", letter: "B", value: 4 };
const BLANK: Tile = { kind: "blank", value: 0 };

describe("tilesAreEquivalent", () => {
  it("matches same-letter tiles", () => {
    expect(tilesAreEquivalent(A, { kind: "letter", letter: "A", value: 1 })).toBe(true);
  });

  it("rejects different letters", () => {
    expect(tilesAreEquivalent(A, B)).toBe(false);
  });

  it("matches two blanks", () => {
    expect(tilesAreEquivalent(BLANK, { kind: "blank", value: 0 })).toBe(true);
  });

  it("rejects blank vs letter", () => {
    expect(tilesAreEquivalent(BLANK, A)).toBe(false);
  });
});

describe("placedToRackTile", () => {
  it("strips the chosen letter from a placed blank", () => {
    const placed: PlacedTile = { kind: "blank", letter: "Q", value: 0 };
    expect(placedToRackTile(placed)).toEqual(BLANK);
  });

  it("returns an equivalent rack tile for a placed letter", () => {
    const placed: PlacedTile = { kind: "letter", letter: "A", value: 1 };
    expect(placedToRackTile(placed)).toEqual(A);
  });
});

describe("removeFromRack", () => {
  const rack: Rack = [A, A, B, BLANK];

  it("removes one occurrence per request", () => {
    const next = removeFromRack(rack, [A]);
    expect(next).toEqual([A, B, BLANK]);
  });

  it("removes multiple tiles", () => {
    const next = removeFromRack(rack, [A, A, B]);
    expect(next).toEqual([BLANK]);
  });

  it("returns null when a tile is missing", () => {
    expect(removeFromRack(rack, [{ kind: "letter", letter: "Z", value: 10 }])).toBeNull();
  });

  it("does not mutate the original rack", () => {
    const original = rack.slice();
    removeFromRack(rack, [A, B]);
    expect(rack).toEqual(original);
  });

  it("returns null when removing more occurrences than present", () => {
    expect(removeFromRack(rack, [A, A, A])).toBeNull();
  });
});

describe("rackContains", () => {
  const rack: Rack = [A, A, B, BLANK];

  it("returns true when all required tiles are present", () => {
    expect(rackContains(rack, [A, B])).toBe(true);
  });

  it("returns false when a tile is missing", () => {
    expect(rackContains(rack, [{ kind: "letter", letter: "Z", value: 10 }])).toBe(false);
  });

  it("handles multiset overshoot correctly", () => {
    expect(rackContains(rack, [A, A, A])).toBe(false);
  });
});

describe("refillRack", () => {
  const bag: TileBag = [A, B, BLANK, A, B];

  it("draws enough to reach the target size", () => {
    const result = refillRack([], bag, 3);
    expect(result.rack).toHaveLength(3);
    expect(result.bag).toHaveLength(2);
  });

  it("does nothing when already at target", () => {
    const result = refillRack([A, B, BLANK], bag, 3);
    expect(result.rack).toEqual([A, B, BLANK]);
    expect(result.bag).toEqual(bag);
  });

  it("draws whatever is available when bag is short", () => {
    const result = refillRack([], [A, B], 7);
    expect(result.rack).toHaveLength(2);
    expect(result.bag).toHaveLength(0);
  });
});
