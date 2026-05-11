import type { GameState } from "../engine/types.js";
import type { HistoryEntry } from "./db.js";
import { IN_PROGRESS_KEY, open } from "./db.js";
import { deserializeGame, serializeGame } from "./serializer.js";

/** Persist (or overwrite) the in-progress game. */
export async function saveInProgress(state: GameState): Promise<void> {
  const db = await open();
  await db.put("in_progress", serializeGame(state), IN_PROGRESS_KEY);
  db.close();
}

/** Load the in-progress game, or null if none. */
export async function loadInProgress(): Promise<GameState | null> {
  const db = await open();
  const raw = await db.get("in_progress", IN_PROGRESS_KEY);
  db.close();
  return raw ? deserializeGame(raw) : null;
}

/** Remove the current in-progress game. */
export async function clearInProgress(): Promise<void> {
  const db = await open();
  await db.delete("in_progress", IN_PROGRESS_KEY);
  db.close();
}

/** Append an entry to the completed-game history. */
export async function pushHistory(state: GameState): Promise<HistoryEntry> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entry: HistoryEntry = {
    id,
    endedAt: Date.now(),
    game: serializeGame(state),
  };
  const db = await open();
  await db.put("history", entry);
  db.close();
  return entry;
}

/** Return all history entries, newest first. */
export async function loadHistory(): Promise<ReadonlyArray<HistoryEntry>> {
  const db = await open();
  const all = await db.getAll("history");
  db.close();
  return all.slice().sort((a, b) => b.endedAt - a.endedAt);
}
