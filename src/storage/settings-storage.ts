import type { Difficulty } from "../engine/ai/bot.js";
import type { Variant } from "../engine/types.js";
import { open } from "./db.js";

const PLAYER_NAMES_KEY = "player_names";
const OPPONENT_KEY = "opponent";
const VARIANT_KEY = "variant";

/** Persisted opponent shape. Mirrors `Opponent` in gameStore. */
export type PersistedOpponent =
  | { readonly kind: "human" }
  | { readonly kind: "ai"; readonly difficulty: Difficulty };

const DEFAULT_OPPONENT: PersistedOpponent = { kind: "human" };

function isDifficulty(x: unknown): x is Difficulty {
  return x === "easy" || x === "medium" || x === "hard";
}

function isOpponent(x: unknown): x is PersistedOpponent {
  if (typeof x !== "object" || x === null) return false;
  const k = (x as { kind?: unknown }).kind;
  if (k === "human") return true;
  if (k === "ai") return isDifficulty((x as { difficulty?: unknown }).difficulty);
  return false;
}

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

/** Retrieve the last-used opponent, or human as default. */
export async function getOpponent(): Promise<PersistedOpponent> {
  const db = await open();
  const entry = await db.get("settings", OPPONENT_KEY);
  db.close();
  const value = entry?.value;
  return isOpponent(value) ? value : DEFAULT_OPPONENT;
}

/** Persist the opponent so it auto-selects on next new-game. */
export async function setOpponent(opponent: PersistedOpponent): Promise<void> {
  const db = await open();
  await db.put("settings", { key: OPPONENT_KEY, value: opponent });
  db.close();
}

const DEFAULT_VARIANT: Variant = "classic";

function isVariant(x: unknown): x is Variant {
  return x === "classic" || x === "random" || x === "mini";
}

/** Retrieve the last-used board variant, or classic as default. */
export async function getVariant(): Promise<Variant> {
  const db = await open();
  const entry = await db.get("settings", VARIANT_KEY);
  db.close();
  const value = entry?.value;
  return isVariant(value) ? value : DEFAULT_VARIANT;
}

/** Persist the variant so it auto-selects on next new-game. */
export async function setVariant(variant: Variant): Promise<void> {
  const db = await open();
  await db.put("settings", { key: VARIANT_KEY, value: variant });
  db.close();
}
