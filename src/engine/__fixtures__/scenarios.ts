/**
 * Reusable game scenarios for tests and future AI development.
 *
 * Each scenario is a thunk so callers can re-create independent state
 * (engine state is immutable but consumers may want fresh objects).
 */
import { createGame } from "../game.js";
import type { GameState, Tile } from "../types.js";

/** Opening-move scenario: fresh 2-player Classic game with deterministic seed. */
export const openingMoveScenario = (): GameState =>
  createGame({ seed: 1, playerNames: ["Alice", "Bob"] });

/**
 * End-game rack-out scenario: bag empty, current player about to play their
 * last 3 rack tiles for a "CAT" rack-out. Opponent has 2 tiles remaining.
 *
 * Note: this scenario does not need to be the result of any specific game
 * history; the engine treats GameState as a pure value.
 */
export const endGameRackOutScenario = (): GameState => {
  const base = createGame({ seed: 5, playerNames: ["P1", "P2"] });
  const rack0: ReadonlyArray<Tile> = [
    { kind: "letter", letter: "C", value: 4 },
    { kind: "letter", letter: "A", value: 1 },
    { kind: "letter", letter: "T", value: 1 },
  ];
  const rack1: ReadonlyArray<Tile> = [
    { kind: "letter", letter: "Q", value: 10 },
    { kind: "letter", letter: "Z", value: 10 },
  ];
  return {
    ...base,
    bag: [],
    players: [
      { name: "P1", rack: rack0, score: 100 },
      { name: "P2", rack: rack1, score: 80 },
    ],
  };
};

/**
 * Four-pass-end scenario: both players have already passed once each;
 * one more pass each will end the game.
 */
export const fourPassesEndScenario = (): GameState => {
  const base = createGame({ seed: 7, playerNames: ["P1", "P2"] });
  return { ...base, consecutivePasses: 2 };
};
