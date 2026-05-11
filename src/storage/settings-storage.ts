import { open } from "./db.js";

const PLAYER_NAMES_KEY = "player_names";

/** Retrieve the last-used pair of player names, or defaults. */
export async function getPlayerNames(): Promise<[string, string]> {
  const db = await open();
  const entry = await db.get("settings", PLAYER_NAMES_KEY);
  db.close();
  const value = entry?.value as [string, string] | undefined;
  return value ?? ["Player 1", "Player 2"];
}

/** Persist the player names so they auto-fill on next new-game. */
export async function setPlayerNames(names: readonly [string, string]): Promise<void> {
  const db = await open();
  await db.put("settings", { key: PLAYER_NAMES_KEY, value: names });
  db.close();
}
