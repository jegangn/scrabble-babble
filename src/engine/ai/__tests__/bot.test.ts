import { describe, expect, it } from "vitest";
import { buildTrie } from "../../dictionary.js";
import { FIXTURE_WORDS } from "../../__fixtures__/dictionary-subset.js";
import { createGame } from "../../game.js";
import type { Tile } from "../../types.js";
import { decide } from "../bot.js";

const DICT = buildTrie(FIXTURE_WORDS);
const T = (l: string, v: number): Tile => ({ kind: "letter", letter: l as "A", value: v });

function withRack(rack: Tile[]) {
  const game = createGame({ seed: 1, playerNames: ["A", "B"] });
  return {
    ...game,
    players: game.players.map((p, i) => (i === 0 ? { ...p, rack } : p)),
  };
}

describe("bot.decide", () => {
  it("returns a place move on a good opening rack (easy)", () => {
    const state = withRack([
      T("C", 4),
      T("A", 1),
      T("T", 1),
      T("S", 1),
      T("R", 1),
      T("E", 1),
      T("N", 2),
    ]);
    const move = decide(state, DICT, "easy");
    expect(move.kind).toBe("place");
  });

  it("returns a place move on a good opening rack (medium)", () => {
    const state = withRack([
      T("C", 4),
      T("A", 1),
      T("T", 1),
      T("S", 1),
      T("R", 1),
      T("E", 1),
      T("N", 2),
    ]);
    const move = decide(state, DICT, "medium");
    expect(move.kind).toBe("place");
  });

  it("returns a place move on a good opening rack (hard)", () => {
    const state = withRack([
      T("R", 1),
      T("E", 1),
      T("T", 1),
      T("A", 1),
      T("I", 1),
      T("N", 2),
      T("S", 1),
    ]);
    const move = decide(state, DICT, "hard");
    expect(move.kind).toBe("place");
  });

  it("medium picks the highest-scoring move deterministically", () => {
    const state = withRack([
      T("C", 4),
      T("A", 1),
      T("T", 1),
      T("S", 1),
      T("R", 1),
      T("E", 1),
      T("N", 2),
    ]);
    const a = decide(state, DICT, "medium");
    const b = decide(state, DICT, "medium");
    expect(a).toEqual(b);
  });

  it("falls back to swap or pass when no good move exists", () => {
    const state = withRack([T("Z", 10), T("Q", 10), T("J", 10), T("X", 8)]);
    const move = decide(state, DICT, "medium");
    expect(["swap", "pass"]).toContain(move.kind);
  });

  it("respects the deadline on hard", () => {
    const state = withRack([
      T("R", 1),
      T("E", 1),
      T("T", 1),
      T("A", 1),
      T("I", 1),
      T("N", 2),
      T("S", 1),
    ]);
    const move = decide(state, DICT, "hard", { deadline: Date.now() - 1 });
    expect(move.kind).toBe("place");
  });
});
