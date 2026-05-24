import { describe, expect, it } from "vitest";
import { buildTrie } from "../dictionary.js";
import { FIXTURE_WORDS } from "../__fixtures__/dictionary-subset.js";
import {
  endGameRackOutScenario,
  fourPassesEndScenario,
  openingMoveScenario,
} from "../__fixtures__/scenarios.js";
import { applyMove, createGame, getGameResult } from "../game.js";
import {
  createPassMove,
  createPlaceMove,
  createResignMove,
  createSwapMove,
} from "../move.js";
import type { EndReason, GameState, Move, PlacedTile, Tile } from "../types.js";

const DICT = buildTrie(FIXTURE_WORDS);
const T = (l: string, v: number): Tile => ({ kind: "letter", letter: l as "A", value: v });
const PT = (l: string, v: number): PlacedTile => ({
  kind: "letter",
  letter: l as "A",
  value: v,
});

describe("createGame", () => {
  it("creates a 2-player game with full racks and bag", () => {
    const game = createGame({ seed: 42, playerNames: ["Alice", "Bob"] });
    expect(game.players).toHaveLength(2);
    expect(game.players[0]!.rack).toHaveLength(7);
    expect(game.players[1]!.rack).toHaveLength(7);
    expect(game.bag).toHaveLength(104 - 14);
    expect(game.turn).toBe(0);
    expect(game.status.kind).toBe("in_progress");
    expect(game.board.size).toBe(15);
    expect(game.consumedPremiums.size).toBe(0);
  });

  it("is deterministic for the same seed", () => {
    const a = createGame({ seed: 99, playerNames: ["P1", "P2"] });
    const b = createGame({ seed: 99, playerNames: ["P1", "P2"] });
    expect(a.players[0]!.rack).toEqual(b.players[0]!.rack);
    expect(a.bag).toEqual(b.bag);
  });
});

describe("applyMove – place", () => {
  it("accepts a valid first move (CAT crossing center)", () => {
    const game = openingMoveScenario();
    const playerRack = game.players[game.turn]!.rack;
    // Force a known rack for determinism
    const forced = {
      ...game,
      players: game.players.map((p, i) =>
        i === game.turn ? { ...p, rack: [T("C", 4), T("A", 1), T("T", 1), ...playerRack.slice(3)] as Tile[] } : p,
      ),
    };
    const move = createPlaceMove([
      { position: { row: 7, col: 6 }, tile: PT("C", 4) },
      { position: { row: 7, col: 7 }, tile: PT("A", 1) },
      { position: { row: 7, col: 8 }, tile: PT("T", 1) },
    ]);
    const result = applyMove(forced, move, DICT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]!.score).toBeGreaterThan(0);
    expect(result.state.turn).toBe(1);
    expect(result.state.consecutivePasses).toBe(0);
    expect(result.state.history).toHaveLength(1);
    expect(result.score?.mainWord.word).toBe("CAT");
  });

  it("rejects an invalid place move and leaves state unchanged", () => {
    const game = openingMoveScenario();
    const move = createPlaceMove([
      { position: { row: 0, col: 0 }, tile: PT("Z", 10) },
    ]);
    const result = applyMove(game, move, DICT);
    expect(result.ok).toBe(false);
  });

  it("records consumedPremiums for non-NONE cells touched", () => {
    const game = openingMoveScenario();
    const forced = {
      ...game,
      players: game.players.map((p, i) =>
        i === 0 ? { ...p, rack: [T("C", 4), T("A", 1), T("T", 1)] as Tile[] } : p,
      ),
    };
    const move = createPlaceMove([
      { position: { row: 7, col: 6 }, tile: PT("C", 4) }, // NONE
      { position: { row: 7, col: 7 }, tile: PT("A", 1) }, // DW
      { position: { row: 7, col: 8 }, tile: PT("T", 1) }, // NONE
    ]);
    const result = applyMove(forced, move, DICT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.consumedPremiums.has("7,7")).toBe(true);
    expect(result.state.consumedPremiums.has("7,6")).toBe(false);
    expect(result.state.consumedPremiums.has("7,8")).toBe(false);
  });
});

describe("applyMove – pass", () => {
  it("increments consecutivePasses and advances turn", () => {
    const game = openingMoveScenario();
    const result = applyMove(game, createPassMove(), DICT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.consecutivePasses).toBe(1);
    expect(result.state.turn).toBe(1);
    expect(result.state.status.kind).toBe("in_progress");
  });

  it("ends the game on the 4th consecutive pass with rack-value penalty", () => {
    let state = fourPassesEndScenario();
    // consecutivePasses starts at 2 in fixture. Need 2 more.
    const scoresBefore = state.players.map((p) => p.score);
    let r = applyMove(state, createPassMove(), DICT);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    state = r.state;
    expect(state.consecutivePasses).toBe(3);
    r = applyMove(state, createPassMove(), DICT);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    state = r.state;
    expect(state.consecutivePasses).toBe(4);
    expect(state.status.kind).toBe("ended");
    expect(state.status.kind === "ended" && state.status.reason.kind).toBe(
      "consecutive_passes",
    );
    // Both players' scores should be ≤ their starting (rack value penalty applied)
    for (let i = 0; i < state.players.length; i++) {
      expect(state.players[i]!.score).toBeLessThanOrEqual(scoresBefore[i]!);
    }
  });
});

describe("applyMove – swap", () => {
  it("returns chosen tiles to bag and draws replacements", () => {
    const game = createGame({ seed: 13, playerNames: ["P1", "P2"] });
    const rack = game.players[0]!.rack;
    const toSwap = [rack[0]!, rack[1]!];
    const result = applyMove(game, createSwapMove(toSwap), DICT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]!.rack).toHaveLength(7);
    expect(result.state.bag.length).toBe(game.bag.length); // size preserved
    expect(result.state.turn).toBe(1);
    expect(result.state.consecutivePasses).toBe(0);
  });

  it("rejects swap when bag is too small", () => {
    const game = createGame({ seed: 13, playerNames: ["P1", "P2"] });
    const empty = { ...game, bag: [] };
    const result = applyMove(empty, createSwapMove([game.players[0]!.rack[0]!]), DICT);
    expect(result.ok).toBe(false);
  });
});

describe("applyMove – resign", () => {
  it("ends the game immediately", () => {
    const game = openingMoveScenario();
    const result = applyMove(game, createResignMove(), DICT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status.kind).toBe("ended");
    expect(
      result.state.status.kind === "ended" && result.state.status.reason.kind,
    ).toBe("resignation");
  });
});

describe("getGameResult", () => {
  // A minimal ended state with the two players' scores and a chosen end reason.
  // getGameResult only reads players[].score and status, so spreading a real
  // game keeps the value well-formed without hand-building every field.
  const endedWith = (scores: [number, number], reason: EndReason): GameState => {
    const base = createGame({ seed: 1, playerNames: ["Alice", "Bob"] });
    return {
      ...base,
      players: base.players.map((p, i) => ({ ...p, score: scores[i]! })),
      status: { kind: "ended", reason },
    };
  };

  it("hands the win to the non-resigner even when scores are tied", () => {
    // Bob (index 1) resigns with the game level at 40–40.
    const state = endedWith([40, 40], { kind: "resignation", playerIndex: 1 });
    expect(getGameResult(state)).toEqual({ kind: "winner", playerIndex: 0 });
  });

  it("hands the win to the non-resigner even when the resigner is ahead", () => {
    // Alice (index 0) resigns while leading 90–30 → Bob still wins.
    const state = endedWith([90, 30], { kind: "resignation", playerIndex: 0 });
    expect(getGameResult(state)).toEqual({ kind: "winner", playerIndex: 1 });
  });

  it("hands the win to the non-resigner when the resigner is behind", () => {
    const state = endedWith([30, 90], { kind: "resignation", playerIndex: 0 });
    expect(getGameResult(state)).toEqual({ kind: "winner", playerIndex: 1 });
  });

  it("awards the higher score for a non-resignation end", () => {
    const state = endedWith([120, 95], { kind: "consecutive_passes" });
    expect(getGameResult(state)).toEqual({ kind: "winner", playerIndex: 0 });
  });

  it("reports a tie when a non-resignation end finishes level", () => {
    const state = endedWith([100, 100], { kind: "rack_out", playerIndex: 0 });
    expect(getGameResult(state)).toEqual({ kind: "tie" });
  });

  it("applyMove(resign) at the opening hands the win to the other player", () => {
    const game = openingMoveScenario(); // 0–0, player 0 to move
    const result = applyMove(game, createResignMove(), DICT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Player 0 resigned on their turn → player 1 wins despite the 0–0 board.
    expect(getGameResult(result.state)).toEqual({ kind: "winner", playerIndex: 1 });
  });
});

describe("applyMove – rack-out end condition", () => {
  it("transfers loser rack value to winner when racking out", () => {
    const state = endGameRackOutScenario();
    // P1 has rack [C,A,T] and plays all 3 → empty rack + empty bag = rack-out
    // P2 has rack [Q(10), Z(10)] = 20 points to transfer
    const move = createPlaceMove([
      { position: { row: 7, col: 6 }, tile: PT("C", 4) },
      { position: { row: 7, col: 7 }, tile: PT("A", 1) },
      { position: { row: 7, col: 8 }, tile: PT("T", 1) },
    ]);
    const result = applyMove(state, move, DICT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status.kind).toBe("ended");
    if (result.state.status.kind === "ended") {
      expect(result.state.status.reason.kind).toBe("rack_out");
    }
    // P1 should have score = 100 + move_score + 20
    const moveScore = result.score!.total;
    expect(result.state.players[0]!.score).toBe(100 + moveScore + 20);
    expect(result.state.players[1]!.score).toBe(80 - 20);
  });
});

describe("applyMove – rejects on ended game", () => {
  it("does not accept moves after end", () => {
    const game = openingMoveScenario();
    const r1 = applyMove(game, createResignMove(), DICT);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const r2 = applyMove(r1.state, createPassMove(), DICT);
    expect(r2.ok).toBe(false);
  });
});

describe("history log", () => {
  it("records every move with correct player index", () => {
    let state = openingMoveScenario();
    const moves: Move[] = [createPassMove(), createPassMove(), createPassMove()];
    for (const m of moves) {
      const r = applyMove(state, m, DICT);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      state = r.state;
    }
    expect(state.history).toHaveLength(3);
    expect(state.history[0]!.playerIndex).toBe(0);
    expect(state.history[1]!.playerIndex).toBe(1);
    expect(state.history[2]!.playerIndex).toBe(0);
  });
});
