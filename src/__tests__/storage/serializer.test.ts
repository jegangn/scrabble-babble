import { describe, expect, it } from "vitest";
import { applyMove, createGame } from "../../engine/game.js";
import { createPlaceMove } from "../../engine/move.js";
import type { PlacedTile, Tile } from "../../engine/types.js";
import { buildTrie } from "../../engine/dictionary.js";
import { FIXTURE_WORDS } from "../../engine/__fixtures__/dictionary-subset.js";
import { deserializeGame, fromJSON, serializeGame, toJSON } from "../../storage/serializer.js";

const DICT = buildTrie(FIXTURE_WORDS);
const PT = (l: string, v: number): PlacedTile => ({ kind: "letter", letter: l as "A", value: v });
const T = (l: string, v: number): Tile => ({ kind: "letter", letter: l as "A", value: v });

describe("serializer", () => {
  it("round-trips an empty new game", () => {
    const game = createGame({ seed: 1, playerNames: ["P1", "P2"] });
    const restored = deserializeGame(serializeGame(game));
    expect(restored).toEqual(game);
  });

  it("round-trips a game with a placed move (Set preserved)", () => {
    let game = createGame({ seed: 1, playerNames: ["P1", "P2"] });
    game = {
      ...game,
      players: game.players.map((p, i) =>
        i === 0
          ? { ...p, rack: [T("C", 4), T("A", 1), T("T", 1), ...p.rack.slice(3)] }
          : p,
      ),
    };
    const move = createPlaceMove([
      { position: { row: 7, col: 6 }, tile: PT("C", 4) },
      { position: { row: 7, col: 7 }, tile: PT("A", 1) },
      { position: { row: 7, col: 8 }, tile: PT("T", 1) },
    ]);
    const result = applyMove(game, move, DICT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const json = toJSON(result.state);
    const restored = fromJSON(json);
    expect(restored.consumedPremiums.has("7,7")).toBe(true);
    expect(restored.players[0]!.score).toBe(result.state.players[0]!.score);
    expect(restored.board.cells[7]![7]!.tile).toEqual({
      kind: "letter",
      letter: "A",
      value: 1,
    });
  });
});
