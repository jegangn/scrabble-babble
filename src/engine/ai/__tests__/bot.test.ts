import { describe, expect, it } from "vitest";
import { buildTrie } from "../../dictionary.js";
import { FIXTURE_WORDS } from "../../__fixtures__/dictionary-subset.js";
import { MINI_BOARD } from "../../config/mini-board.js";
import { MINI_TILES } from "../../config/mini-tiles.js";
import { createGame } from "../../game.js";
import type { Tile } from "../../types.js";
import { decide, migrateLegacyDifficulty } from "../bot.js";
import type { Difficulty } from "../bot.js";

const DICT = buildTrie(FIXTURE_WORDS);
const T = (l: string, v: number): Tile => ({ kind: "letter", letter: l as "A", value: v });

const BINGO_RACK: Tile[] = [
  T("R", 1),
  T("E", 1),
  T("T", 1),
  T("A", 1),
  T("I", 1),
  T("N", 2),
  T("S", 1),
];

function withRack(rack: Tile[]) {
  const game = createGame({ seed: 1, playerNames: ["A", "B"] });
  return {
    ...game,
    players: game.players.map((p, i) => (i === 0 ? { ...p, rack } : p)),
  };
}

function miniWithRack(rack: Tile[]) {
  const game = createGame({
    seed: 1,
    playerNames: ["A", "B"],
    variant: "mini",
    boardConfig: MINI_BOARD,
    distribution: MINI_TILES,
  });
  return {
    ...game,
    players: game.players.map((p, i) => (i === 0 ? { ...p, rack } : p)),
  };
}

const ALL_TIERS: ReadonlyArray<Difficulty> = [
  "friendly",
  "easygoing",
  "steady",
  "sharp",
  "master",
];

describe("bot.decide", () => {
  it.each(ALL_TIERS)("returns a place move on a good opening rack (%s)", (diff) => {
    const state = withRack([...BINGO_RACK]);
    const move = decide(state, DICT, diff);
    expect(move.kind).toBe("place");
  });

  it("master picks deterministically (top-1, no PRNG variance)", () => {
    const state = withRack([...BINGO_RACK]);
    const a = decide(state, DICT, "master");
    const b = decide(state, DICT, "master");
    expect(a).toEqual(b);
  });

  it("falls back to swap or pass when no good move exists", () => {
    const state = withRack([T("Z", 10), T("Q", 10), T("J", 10), T("X", 8)]);
    const move = decide(state, DICT, "steady");
    expect(["swap", "pass"]).toContain(move.kind);
  });

  it.each(ALL_TIERS)("returns a place move on a Mini opening rack (%s)", (diff) => {
    const rack: Tile[] = [...BINGO_RACK];
    const state = miniWithRack(rack);
    const move = decide(state, DICT, diff);
    expect(move.kind, `${diff} on Mini`).toBe("place");
  });

  it("respects the deadline on sharp (1-ply lookahead is bounded)", () => {
    const state = withRack([...BINGO_RACK]);
    const move = decide(state, DICT, "sharp", { deadline: Date.now() - 1 });
    expect(move.kind).toBe("place");
  });

  // ----- Cap invariants: the headline natural-feel feature. -----

  it("friendly NEVER places more than 4 rack tiles, even on a bingo rack", () => {
    // Bingo rack {R,E,T,A,I,N,S} has many 7-tile plays available. Friendly's
    // cap must filter them out so the bot picks a shorter (≤ 4-tile) play.
    const state = withRack([...BINGO_RACK]);
    const move = decide(state, DICT, "friendly");
    expect(move.kind).toBe("place");
    if (move.kind === "place") {
      expect(move.placements.length).toBeLessThanOrEqual(4);
    }
  });

  it("easygoing NEVER places more than 5 rack tiles", () => {
    const state = withRack([...BINGO_RACK]);
    const move = decide(state, DICT, "easygoing");
    expect(move.kind).toBe("place");
    if (move.kind === "place") {
      expect(move.placements.length).toBeLessThanOrEqual(5);
    }
  });

  it("friendly never bingos across many seeds", () => {
    // Bingo = placing all 7 rack tiles. Run 30 seeds; the cap (4) must hold
    // every time. If a regression removed the cap, this would surface a
    // 7-tile placement within a handful of seeds on a bingo-prone rack.
    for (let seed = 1; seed <= 30; seed++) {
      const game = createGame({ seed, playerNames: ["A", "B"] });
      const state = {
        ...game,
        players: game.players.map((p, i) =>
          i === 0 ? { ...p, rack: [...BINGO_RACK] } : p,
        ),
      };
      const move = decide(state, DICT, "friendly");
      if (move.kind === "place") {
        expect(move.placements.length).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe("migrateLegacyDifficulty", () => {
  it("maps legacy 3-tier IDs to the new 5-tier system", () => {
    expect(migrateLegacyDifficulty("easy")).toBe("easygoing");
    expect(migrateLegacyDifficulty("medium")).toBe("steady");
    expect(migrateLegacyDifficulty("hard")).toBe("sharp");
  });

  it("passes through new 5-tier IDs unchanged", () => {
    for (const t of ALL_TIERS) {
      expect(migrateLegacyDifficulty(t)).toBe(t);
    }
  });

  it("falls back to easygoing for unrecognised values", () => {
    expect(migrateLegacyDifficulty("expert")).toBe("easygoing");
    expect(migrateLegacyDifficulty("")).toBe("easygoing");
  });
});
