import { cellKey, isBoardEmpty, isInBounds, isOccupied } from "./board.js";
import type { TrieNode } from "./dictionary.js";
import { lookup } from "./dictionary.js";
import { extractWords, moveDirection } from "./move.js";
import { placedToRackTile, rackContains, tilesAreEquivalent } from "./rack.js";
import type {
  CellKey,
  GameState,
  Move,
  MoveValidation,
  PassMove,
  PlaceMove,
  ResignMove,
  SwapMove,
  Tile,
  ValidationError,
} from "./types.js";

function err(error: ValidationError): MoveValidation {
  return { ok: false, error };
}

const OK: MoveValidation = { ok: true };

function gameEnded(state: GameState): boolean {
  return state.status.kind === "ended";
}

function findMissingTile(rack: ReadonlyArray<Tile>, required: ReadonlyArray<Tile>): Tile | null {
  const remaining: Tile[] = rack.slice();
  for (const tile of required) {
    const idx = remaining.findIndex((r) => tilesAreEquivalent(r, tile));
    if (idx === -1) return tile;
    remaining.splice(idx, 1);
  }
  return null;
}

/** Validate a place move against the current state and dictionary. */
export function validatePlaceMove(
  state: GameState,
  move: PlaceMove,
  dictionary: TrieNode,
): MoveValidation {
  if (gameEnded(state)) return err({ kind: "game_already_ended" });
  if (move.placements.length === 0) return err({ kind: "empty_placement" });

  // Bounds + duplicates + already-occupied
  const seen = new Set<CellKey>();
  for (const p of move.placements) {
    if (!isInBounds(state.board, p.position)) {
      return err({ kind: "out_of_bounds", position: p.position });
    }
    if (isOccupied(state.board, p.position)) {
      return err({ kind: "cell_already_occupied", position: p.position });
    }
    const key = cellKey(p.position);
    if (seen.has(key)) return err({ kind: "duplicate_position", position: p.position });
    seen.add(key);
  }

  // Single line
  const direction = moveDirection(move.placements);
  if (direction === null) return err({ kind: "not_single_line" });

  // Rack contains the required tiles (multiset, with blank substitution as needed)
  const rackTiles = move.placements.map((p) => placedToRackTile(p.tile));
  const player = state.players[state.turn]!;
  const missing = findMissingTile(player.rack, rackTiles);
  if (missing !== null) return err({ kind: "tile_not_in_rack", tile: missing });

  // Word extraction. Null = either no word formed or gap.
  const words = extractWords(state.board, move.placements);
  if (!words) {
    if (move.placements.length === 1) return err({ kind: "must_form_word" });
    return err({ kind: "gap_in_word" });
  }

  // Ensure every placement is in the main word's contiguous run (catches placement gaps
  // that walkWord couldn't bridge from one end).
  const mainKeys = new Set(words.main.positions.map(cellKey));
  for (const p of move.placements) {
    if (!mainKeys.has(cellKey(p.position))) {
      return err({ kind: "gap_in_word" });
    }
  }

  // First-move rule vs connection rule
  if (isBoardEmpty(state.board)) {
    const center = Math.floor(state.boardConfig.size / 2);
    const crossesCenter = move.placements.some(
      (p) => p.position.row === center && p.position.col === center,
    );
    if (!crossesCenter) return err({ kind: "first_move_must_cross_center" });
  } else {
    const placementCount = move.placements.length;
    const mainHasAnchors = words.main.positions.length > placementCount;
    const hasCross = words.crosses.length > 0;
    if (!mainHasAnchors && !hasCross) {
      return err({ kind: "not_connected_to_existing" });
    }
  }

  // Dictionary check for every formed word
  for (const w of [words.main, ...words.crosses]) {
    if (!lookup(dictionary, w.letters)) {
      return err({ kind: "invalid_word", word: w.letters });
    }
  }

  return OK;
}

/** Validate a swap move. */
export function validateSwapMove(state: GameState, move: SwapMove): MoveValidation {
  if (gameEnded(state)) return err({ kind: "game_already_ended" });
  if (state.bag.length < state.rules.minBagToSwap) {
    return err({
      kind: "swap_bag_too_small",
      bagSize: state.bag.length,
      minimum: state.rules.minBagToSwap,
    });
  }
  if (move.tiles.length === 0) return err({ kind: "empty_placement" });
  const player = state.players[state.turn]!;
  const missing = findMissingTile(player.rack, move.tiles);
  if (missing !== null) return err({ kind: "swap_tile_not_in_rack", tile: missing });
  return OK;
}

/** Validate a pass move. */
export function validatePassMove(state: GameState, _move: PassMove): MoveValidation {
  if (gameEnded(state)) return err({ kind: "game_already_ended" });
  return OK;
}

/** Validate a resign move. */
export function validateResignMove(state: GameState, _move: ResignMove): MoveValidation {
  if (gameEnded(state)) return err({ kind: "game_already_ended" });
  return OK;
}

/** Validate any move via discriminated dispatch. */
export function validateMove(
  state: GameState,
  move: Move,
  dictionary: TrieNode,
): MoveValidation {
  switch (move.kind) {
    case "place":
      return validatePlaceMove(state, move, dictionary);
    case "swap":
      return validateSwapMove(state, move);
    case "pass":
      return validatePassMove(state, move);
    case "resign":
      return validateResignMove(state, move);
  }
}
