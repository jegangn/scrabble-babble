import type { CellKey, GameState } from "../engine/types.js";

/**
 * Persisted shape of GameState. Sets are arrays in JSON; everything else
 * is JSON-native already (the engine uses no Maps or Dates).
 *
 * Note: Phase 1 and 2 saves predate the `variant` field; deserialization
 * tolerates its absence and defaults to "classic".
 */
export interface SerializedGameState extends Omit<GameState, "consumedPremiums"> {
  readonly consumedPremiums: ReadonlyArray<CellKey>;
}

/** Convert a GameState to a JSON-safe object. */
export function serializeGame(state: GameState): SerializedGameState {
  const { consumedPremiums, ...rest } = state;
  return { ...rest, consumedPremiums: Array.from(consumedPremiums) };
}

/**
 * Validate a parsed object is a well-formed SerializedGameState before we
 * let it back into the engine. A hand-edited import file with negative
 * scores, off-board placements, or missing config would otherwise silently
 * deserialize and then crash inside the engine on the next move with no
 * useful error. Better to reject up front.
 *
 * This is a structural check, not a full game-rule audit — the engine still
 * enforces invariants. We just want a clean rejection at the import boundary.
 */
function assertSerializedShape(value: unknown): asserts value is SerializedGameState {
  if (!value || typeof value !== "object") throw new Error("Save is not an object");
  const v = value as Record<string, unknown>;

  if (!Array.isArray(v.players) || v.players.length !== 2) {
    throw new Error("Save must have exactly 2 players");
  }
  for (const p of v.players as ReadonlyArray<Record<string, unknown>>) {
    if (typeof p?.name !== "string") throw new Error("Player missing name");
    if (typeof p.score !== "number" || p.score < 0) throw new Error("Invalid player score");
    if (!Array.isArray(p.rack)) throw new Error("Player rack must be an array");
  }
  if (v.turn !== 0 && v.turn !== 1) throw new Error("turn must be 0 or 1");

  if (!v.board || typeof v.board !== "object") throw new Error("Missing board");
  const board = v.board as Record<string, unknown>;
  if (typeof board.size !== "number" || !Array.isArray(board.cells)) {
    throw new Error("Invalid board");
  }
  if ((board.cells as unknown[]).length !== board.size) {
    throw new Error("Board cells row count does not match size");
  }

  if (!v.boardConfig || typeof v.boardConfig !== "object") {
    throw new Error("Missing boardConfig");
  }
  if (!v.rules || typeof v.rules !== "object") throw new Error("Missing rules");
  if (!Array.isArray(v.bag)) throw new Error("bag must be an array");
  if (!Array.isArray(v.history)) throw new Error("history must be an array");
  if (!Array.isArray(v.consumedPremiums)) {
    throw new Error("consumedPremiums must be an array");
  }
  if (!v.status || typeof v.status !== "object") throw new Error("Missing status");
}

/** Inverse of serializeGame. Throws on missing/malformed required fields. */
export function deserializeGame(data: SerializedGameState): GameState {
  assertSerializedShape(data);
  const { consumedPremiums, ...rest } = data;
  // Backwards compatibility: pre-Phase-3 saves lack `variant`. Treat them as classic.
  const variant = rest.variant ?? "classic";
  return { ...rest, variant, consumedPremiums: new Set(consumedPremiums) };
}

/** Round-trip through JSON.stringify/JSON.parse for IDB or file backups. */
export function toJSON(state: GameState): string {
  return JSON.stringify(serializeGame(state));
}

/** Inverse of toJSON. Throws on invalid JSON or invalid shape. */
export function fromJSON(json: string): GameState {
  return deserializeGame(JSON.parse(json) as SerializedGameState);
}
