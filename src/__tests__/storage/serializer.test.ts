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

  it("defaults `variant` to classic when restoring a pre-Phase-3 save", () => {
    const game = createGame({ seed: 1, playerNames: ["P1", "P2"] });
    const serialized = serializeGame(game);
    // Simulate a legacy save: strip the `variant` field that didn't exist before P3.
    const { variant: _v, ...legacy } = serialized;
    void _v;
    const restored = deserializeGame(legacy as typeof serialized);
    expect(restored.variant).toBe("classic");
  });

  describe("import validation (defensive)", () => {
    // These tests cover the structural validator added to deserializeGame.
    // The validator rejects hand-edited / corrupted imports at the boundary
    // so the engine never has to deal with malformed state.
    const validSave = () => serializeGame(createGame({ seed: 1, playerNames: ["P1", "P2"] }));

    it("rejects a non-object payload", () => {
      expect(() => deserializeGame(null as unknown as ReturnType<typeof validSave>)).toThrow();
      expect(() => deserializeGame("oops" as unknown as ReturnType<typeof validSave>)).toThrow();
    });

    it("rejects negative player scores", () => {
      const v = validSave();
      const corrupted = {
        ...v,
        players: v.players.map((p, i) => (i === 0 ? { ...p, score: -10 } : p)) as typeof v.players,
      };
      expect(() => deserializeGame(corrupted)).toThrow(/score/i);
    });

    it("rejects when there are not exactly 2 players", () => {
      const v = validSave();
      const corrupted = { ...v, players: [v.players[0]!] as unknown as typeof v.players };
      expect(() => deserializeGame(corrupted)).toThrow(/2 players/i);
    });

    it("rejects turn values outside {0, 1}", () => {
      const v = validSave();
      const corrupted = { ...v, turn: 5 as unknown as 0 | 1 };
      expect(() => deserializeGame(corrupted)).toThrow(/turn/i);
    });

    it("rejects when board.cells row count does not match board.size", () => {
      const v = validSave();
      const corrupted = {
        ...v,
        board: { ...v.board, cells: v.board.cells.slice(0, 3) } as typeof v.board,
      };
      expect(() => deserializeGame(corrupted)).toThrow(/row count/i);
    });

    it("rejects when consumedPremiums is not an array", () => {
      const v = validSave();
      const corrupted = { ...v, consumedPremiums: "not-an-array" as unknown as ReadonlyArray<never> };
      expect(() => deserializeGame(corrupted)).toThrow(/consumedPremiums/i);
    });

    it("accepts a well-formed save", () => {
      expect(() => deserializeGame(validSave())).not.toThrow();
    });
  });
});
