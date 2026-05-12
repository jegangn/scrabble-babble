import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { buildTrie } from "../../engine/dictionary.js";
import { FIXTURE_WORDS } from "../../engine/__fixtures__/dictionary-subset.js";
import { useGameStore } from "../../store/gameStore.js";
import type { PlacedTile, Tile } from "../../engine/types.js";

const DICT = buildTrie(FIXTURE_WORDS);

async function resetDb(): Promise<void> {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("scrabble-babble");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  await resetDb();
  useGameStore.setState({
    screen: { kind: "loading" },
    dictionary: null,
    game: null,
    pending: [],
    rackOrder: [0, 1, 2, 3, 4, 5, 6],
    settings: { playerNames: ["Player 1", "Player 2"], opponent: { kind: "human" } },
    aiPlayerIndex: null,
    error: null,
    pendingBlankAt: null,
  });
});

describe("gameStore", () => {
  it("starts in loading; setDictionary sets the trie", () => {
    expect(useGameStore.getState().screen.kind).toBe("loading");
    useGameStore.getState().setDictionary(DICT);
    expect(useGameStore.getState().dictionary).toBe(DICT);
  });

  it("startNewGame transitions to game screen with a fresh game", () => {
    useGameStore.getState().setDictionary(DICT);
    useGameStore.getState().startNewGame(["A", "B"]);
    const s = useGameStore.getState();
    expect(s.screen.kind).toBe("game");
    expect(s.game?.players[0]?.name).toBe("A");
    expect(s.game?.players[1]?.name).toBe("B");
    expect(s.pending).toHaveLength(0);
  });

  it("recallPending clears pending placements", () => {
    useGameStore.getState().setDictionary(DICT);
    useGameStore.getState().startNewGame(["A", "B"]);
    const placed: PlacedTile = { kind: "letter", letter: "A", value: 1 };
    useGameStore.setState({
      pending: [{ position: { row: 7, col: 7 }, tile: placed, rackIndex: 0 }],
    });
    useGameStore.getState().recallPending();
    expect(useGameStore.getState().pending).toHaveLength(0);
  });

  it("submitMove rejects an empty pending list", () => {
    useGameStore.getState().setDictionary(DICT);
    useGameStore.getState().startNewGame(["A", "B"]);
    useGameStore.getState().submitMove();
    expect(useGameStore.getState().error).toBeTruthy();
  });

  it("pass advances the turn", () => {
    useGameStore.getState().setDictionary(DICT);
    useGameStore.getState().startNewGame(["A", "B"]);
    const before = useGameStore.getState().game!.turn;
    useGameStore.getState().pass();
    const s = useGameStore.getState();
    expect(s.game!.turn).toBe(1 - before);
    expect(s.screen.kind).toBe("handoff");
  });

  it("resign ends the game", () => {
    useGameStore.getState().setDictionary(DICT);
    useGameStore.getState().startNewGame(["A", "B"]);
    useGameStore.getState().resign();
    const s = useGameStore.getState();
    expect(s.screen.kind).toBe("game_end");
    expect(s.game!.status.kind).toBe("ended");
  });

  it("placeFromRack adds a pending placement", () => {
    useGameStore.getState().setDictionary(DICT);
    useGameStore.getState().startNewGame(["A", "B"]);
    const tile = useGameStore.getState().game!.players[0]!.rack[0]! as Tile;
    useGameStore.getState().placeFromRack(0, { row: 7, col: 7 });
    const s = useGameStore.getState();
    expect(s.pending).toHaveLength(1);
    if (tile.kind === "letter") {
      expect(s.pending[0]!.tile.kind).toBe("letter");
    }
  });

  it("recallOne removes a pending placement at a position", () => {
    useGameStore.getState().setDictionary(DICT);
    useGameStore.getState().startNewGame(["A", "B"]);
    useGameStore.getState().placeFromRack(0, { row: 7, col: 7 });
    expect(useGameStore.getState().pending).toHaveLength(1);
    useGameStore.getState().recallOne({ row: 7, col: 7 });
    expect(useGameStore.getState().pending).toHaveLength(0);
  });

  it("startNewGame with AI opponent records aiPlayerIndex=1 and names player 2 'Computer'", () => {
    useGameStore.getState().setDictionary(DICT);
    useGameStore.getState().startNewGame(["A", "B"], { kind: "ai", difficulty: "medium" });
    const s = useGameStore.getState();
    expect(s.aiPlayerIndex).toBe(1);
    expect(s.game?.players[1]?.name).toBe("Computer");
    expect(s.settings.opponent).toEqual({ kind: "ai", difficulty: "medium" });
  });

  it("startNewGame with hot-seat opponent clears aiPlayerIndex", () => {
    useGameStore.getState().setDictionary(DICT);
    useGameStore.getState().startNewGame(["A", "B"], { kind: "human" });
    expect(useGameStore.getState().aiPlayerIndex).toBeNull();
  });

  it("applyAiMove with a pass advances the game and clears thinking", () => {
    useGameStore.getState().setDictionary(DICT);
    useGameStore.getState().startNewGame(["You", "Computer"], { kind: "ai", difficulty: "easy" });
    // Pretend the human just played; now it's the AI's turn.
    useGameStore.getState().pass();
    // After pass, it's AI's turn 1. Drive the AI by applying a pass move.
    useGameStore.setState({ thinking: true });
    useGameStore.getState().applyAiMove({ kind: "pass" });
    const s = useGameStore.getState();
    expect(s.thinking).toBe(false);
    expect(s.game?.consecutivePasses).toBeGreaterThanOrEqual(2);
  });

  it("post-move transition skips handoff when the next player is the AI", () => {
    useGameStore.getState().setDictionary(DICT);
    useGameStore.getState().startNewGame(["You", "Computer"], { kind: "ai", difficulty: "easy" });
    useGameStore.getState().pass();
    // Next turn is AI — screen should be `game`, not `handoff`.
    expect(useGameStore.getState().screen.kind).toBe("game");
  });
});
