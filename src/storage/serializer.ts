import type { CellKey, GameState } from "../engine/types.js";

/**
 * Persisted shape of GameState. Sets are arrays in JSON; everything else
 * is JSON-native already (the engine uses no Maps or Dates).
 */
export interface SerializedGameState extends Omit<GameState, "consumedPremiums"> {
  readonly consumedPremiums: ReadonlyArray<CellKey>;
}

/** Convert a GameState to a JSON-safe object. */
export function serializeGame(state: GameState): SerializedGameState {
  const { consumedPremiums, ...rest } = state;
  return { ...rest, consumedPremiums: Array.from(consumedPremiums) };
}

/** Inverse of serializeGame. */
export function deserializeGame(data: SerializedGameState): GameState {
  const { consumedPremiums, ...rest } = data;
  return { ...rest, consumedPremiums: new Set(consumedPremiums) };
}

/** Round-trip through JSON.stringify/JSON.parse for IDB or file backups. */
export function toJSON(state: GameState): string {
  return JSON.stringify(serializeGame(state));
}

/** Inverse of toJSON. Throws on invalid JSON. */
export function fromJSON(json: string): GameState {
  return deserializeGame(JSON.parse(json) as SerializedGameState);
}
