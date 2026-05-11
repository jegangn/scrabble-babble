import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { createGame } from "../../engine/game.js";
import {
  clearInProgress,
  loadHistory,
  loadInProgress,
  pushHistory,
  saveInProgress,
} from "../../storage/game-storage.js";
import { getPlayerNames, setPlayerNames } from "../../storage/settings-storage.js";

// Reset the fake IDB between tests by reopening with a deleteDatabase wrapper.
async function resetDb(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase("scrabble-babble");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe("game-storage round-trip", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("saves and reloads an in-progress game", async () => {
    const game = createGame({ seed: 7, playerNames: ["A", "B"] });
    await saveInProgress(game);
    const restored = await loadInProgress();
    expect(restored).not.toBeNull();
    expect(restored?.seed).toBe(7);
    expect(restored?.players[0]?.name).toBe("A");
  });

  it("returns null when there is no in-progress game", async () => {
    expect(await loadInProgress()).toBeNull();
  });

  it("clears the in-progress game", async () => {
    const game = createGame({ seed: 1, playerNames: ["A", "B"] });
    await saveInProgress(game);
    await clearInProgress();
    expect(await loadInProgress()).toBeNull();
  });

  it("history append and read back", async () => {
    const game = createGame({ seed: 2, playerNames: ["A", "B"] });
    await pushHistory(game);
    await pushHistory(game);
    const history = await loadHistory();
    expect(history.length).toBe(2);
  });
});

describe("settings-storage", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("defaults to Player 1 / Player 2 when nothing saved", async () => {
    const names = await getPlayerNames();
    expect(names).toEqual(["Player 1", "Player 2"]);
  });

  it("round-trips player names", async () => {
    await setPlayerNames(["Tom", "Jerry"]);
    expect(await getPlayerNames()).toEqual(["Tom", "Jerry"]);
  });
});
