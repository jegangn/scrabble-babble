import { create } from "zustand";
import type { Difficulty } from "../engine/ai/bot.js";
import type { TrieNode } from "../engine/dictionary.js";
import { applyMove, createGame } from "../engine/game.js";
import { cellKey, isOccupied } from "../engine/board.js";
import {
  createPassMove,
  createResignMove,
  createSwapMove,
} from "../engine/move.js";
import { tilesAreEquivalent } from "../engine/rack.js";
import type {
  GameState,
  Letter,
  Move,
  PlacedTile,
  Position,
  Tile,
  ValidationError,
} from "../engine/types.js";
import {
  clearInProgress,
  pushHistory,
  saveInProgress,
} from "../storage/game-storage.js";
import { setOpponent, setPlayerNames } from "../storage/settings-storage.js";
import { pendingAt, pendingToMove } from "./pending.js";
import type { PendingPlacement } from "./pending.js";

/** Who the human plays against. AI carries its difficulty. */
export type Opponent =
  | { readonly kind: "human" }
  | { readonly kind: "ai"; readonly difficulty: Difficulty };

/** Default opponent for first-time players: hot-seat vs another human. */
export const DEFAULT_OPPONENT: Opponent = { kind: "human" };

export type Screen =
  | { kind: "loading" }
  | { kind: "home" }
  | { kind: "new_game" }
  | { kind: "game" }
  | { kind: "handoff"; nextPlayerIndex: number }
  | { kind: "game_end" };

export interface StoreState {
  screen: Screen;
  dictionary: TrieNode | null;
  game: GameState | null;
  pending: ReadonlyArray<PendingPlacement>;
  /** Visual order of tiles in the current player's rack — UI-only. */
  rackOrder: ReadonlyArray<number>;
  settings: { playerNames: [string, string]; opponent: Opponent };
  /** Index of the AI-controlled player slot in the current game (always 1 today), or null for hot-seat. */
  aiPlayerIndex: number | null;
  /** True while the bot is computing a move; UI shows a thinking overlay. */
  thinking: boolean;
  error: string | null;
  /** A blank tile dropped on the board that needs a chosen letter. */
  pendingBlankAt: Position | null;

  // Init
  setDictionary: (trie: TrieNode) => void;
  setScreen: (screen: Screen) => void;
  setSettings: (names: [string, string]) => void;
  setOpponent: (opponent: Opponent) => void;
  setThinking: (thinking: boolean) => void;
  hydrate: (game: GameState) => void;

  // Game flow
  startNewGame: (names: [string, string], opponent?: Opponent) => void;
  goHome: () => void;

  // Move actions
  submitMove: () => void;
  recallPending: () => void;
  shuffleRack: () => void;
  swap: (tiles: ReadonlyArray<Tile>) => void;
  pass: () => void;
  resign: () => void;
  /** Apply a fully-formed move on behalf of the bot. */
  applyAiMove: (move: Move) => void;

  // Drag/drop actions
  placeFromRack: (rackIndex: number, position: Position) => void;
  recallOne: (position: Position) => void;
  setBlankLetter: (letter: Letter) => void;
  cancelBlankPicker: () => void;
}

function formatError(error: ValidationError): string {
  switch (error.kind) {
    case "empty_placement":
      return "Place at least one tile.";
    case "out_of_bounds":
      return "That cell is off the board.";
    case "cell_already_occupied":
      return "That cell already has a tile.";
    case "duplicate_position":
      return "Two tiles can't share a cell.";
    case "not_single_line":
      return "All tiles in a move must be in one row or column.";
    case "gap_in_word":
      return "Your word has a gap.";
    case "first_move_must_cross_center":
      return "The first word must cross the centre star.";
    case "not_connected_to_existing":
      return "Your word must touch an existing tile.";
    case "blank_missing_letter":
      return "Pick a letter for the blank tile.";
    case "tile_not_in_rack":
      return "You don't have that tile in your rack.";
    case "invalid_word":
      return `"${error.word}" isn't in the dictionary.`;
    case "must_form_word":
      return "Your move must form a word.";
    case "swap_bag_too_small":
      return `Need at least ${error.minimum} tile in the bag to swap.`;
    case "swap_tile_not_in_rack":
      return "You can't swap a tile you don't have.";
    case "game_already_ended":
      return "The game is already over.";
  }
}

function newRackOrder(size: number): number[] {
  return Array.from({ length: size }, (_, i) => i);
}

/**
 * Single source of truth for the screen transition after any successful move.
 * - Game ended → game_end (plus push history, clear in-progress).
 * - Next player is the AI → straight back to `game` (no handoff overlay).
 * - Next player is human (hot-seat) → `handoff`.
 *
 * `thinking` is always reset; the AI driver effect flips it back on if needed.
 */
function applyPostMoveTransition(
  nextState: GameState,
  get: () => StoreState,
  set: (partial: Partial<StoreState>) => void,
): void {
  const ended = nextState.status.kind === "ended";
  if (ended) {
    void pushHistory(nextState);
    void clearInProgress();
    set({
      game: nextState,
      pending: [],
      rackOrder: newRackOrder(nextState.players[nextState.turn]!.rack.length),
      screen: { kind: "game_end" },
      thinking: false,
      error: null,
    });
    return;
  }
  const aiIdx = get().aiPlayerIndex;
  const nextIsAi = aiIdx !== null && nextState.turn === aiIdx;
  set({
    game: nextState,
    pending: [],
    rackOrder: newRackOrder(nextState.players[nextState.turn]!.rack.length),
    screen: nextIsAi
      ? { kind: "game" }
      : { kind: "handoff", nextPlayerIndex: nextState.turn },
    thinking: false,
    error: null,
  });
}

export const useGameStore = create<StoreState>((set, get) => ({
  screen: { kind: "loading" },
  dictionary: null,
  game: null,
  pending: [],
  rackOrder: newRackOrder(7),
  settings: { playerNames: ["Player 1", "Player 2"], opponent: DEFAULT_OPPONENT },
  aiPlayerIndex: null,
  thinking: false,
  error: null,
  pendingBlankAt: null,

  setDictionary: (dictionary) => set({ dictionary }),
  setScreen: (screen) => set({ screen, error: null }),
  setSettings: (playerNames) =>
    set((state) => ({ settings: { ...state.settings, playerNames } })),
  setOpponent: (opponent) =>
    set((state) => ({ settings: { ...state.settings, opponent } })),
  setThinking: (thinking) => set({ thinking }),

  hydrate: (game) => {
    const rackSize = game.players[game.turn]?.rack.length ?? 7;
    // Infer the AI player slot from the persisted opponent setting. Resumed
    // games keep playing against the same opponent the user last chose.
    const opp = get().settings.opponent;
    const aiPlayerIndex = opp.kind === "ai" ? 1 : null;
    set({
      game,
      pending: [],
      rackOrder: newRackOrder(rackSize),
      aiPlayerIndex,
      screen: game.status.kind === "ended" ? { kind: "game_end" } : { kind: "game" },
      thinking: false,
      error: null,
    });
  },

  startNewGame: (names, opponent) => {
    const seed = Date.now() & 0x7fffffff;
    // Computer always plays the second slot in the players list.
    const effectiveNames: [string, string] =
      opponent?.kind === "ai" ? [names[0], "Computer"] : names;
    const game = createGame({ seed, playerNames: effectiveNames });
    const resolvedOpponent: Opponent = opponent ?? get().settings.opponent;
    void setPlayerNames(names);
    void setOpponent(resolvedOpponent);
    void saveInProgress(game);
    set({
      game,
      pending: [],
      rackOrder: newRackOrder(game.players[0]!.rack.length),
      settings: { playerNames: names, opponent: resolvedOpponent },
      aiPlayerIndex: resolvedOpponent.kind === "ai" ? 1 : null,
      screen: { kind: "game" },
      error: null,
    });
  },

  goHome: () => {
    set({
      screen: { kind: "home" },
      error: null,
      pending: [],
      pendingBlankAt: null,
      thinking: false,
    });
  },

  submitMove: () => {
    const { game, pending, dictionary } = get();
    if (!game || !dictionary) return;
    if (pending.length === 0) {
      set({ error: "Place tiles before submitting." });
      return;
    }
    const move = pendingToMove(pending);
    const result = applyMove(game, move, dictionary);
    if (!result.ok) {
      set({ error: formatError(result.error) });
      return;
    }
    void saveInProgress(result.state);
    applyPostMoveTransition(result.state, get, set);
  },

  recallPending: () => set({ pending: [], pendingBlankAt: null, error: null }),

  shuffleRack: () => {
    const { rackOrder } = get();
    const next = rackOrder.slice();
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = next[i]!;
      const b = next[j]!;
      next[i] = b;
      next[j] = a;
    }
    set({ rackOrder: next });
  },

  swap: (tiles) => {
    const { game, dictionary } = get();
    if (!game || !dictionary) return;
    const result = applyMove(game, createSwapMove(tiles), dictionary);
    if (!result.ok) {
      set({ error: formatError(result.error) });
      return;
    }
    void saveInProgress(result.state);
    applyPostMoveTransition(result.state, get, set);
  },

  pass: () => {
    const { game, dictionary } = get();
    if (!game || !dictionary) return;
    const result = applyMove(game, createPassMove(), dictionary);
    if (!result.ok) {
      set({ error: formatError(result.error) });
      return;
    }
    void saveInProgress(result.state);
    applyPostMoveTransition(result.state, get, set);
  },

  resign: () => {
    const { game, dictionary } = get();
    if (!game || !dictionary) return;
    const result = applyMove(game, createResignMove(), dictionary);
    if (!result.ok) {
      set({ error: formatError(result.error) });
      return;
    }
    void pushHistory(result.state);
    void clearInProgress();
    set({
      game: result.state,
      pending: [],
      rackOrder: newRackOrder(result.state.players[result.state.turn]!.rack.length),
      screen: { kind: "game_end" },
      thinking: false,
      error: null,
    });
  },

  applyAiMove: (move) => {
    const { game, dictionary } = get();
    if (!game || !dictionary) return;
    const result = applyMove(game, move, dictionary);
    if (!result.ok) {
      // Bot returned an invalid move (shouldn't happen). Fall back to pass.
      const fallback = applyMove(game, createPassMove(), dictionary);
      if (!fallback.ok) {
        set({ error: formatError(fallback.error), thinking: false });
        return;
      }
      void saveInProgress(fallback.state);
      applyPostMoveTransition(fallback.state, get, set);
      return;
    }
    void saveInProgress(result.state);
    applyPostMoveTransition(result.state, get, set);
  },

  placeFromRack: (rackIndex, position) => {
    const { game, pending, pendingBlankAt } = get();
    if (!game || pendingBlankAt) return;
    const rack = game.players[game.turn]!.rack;
    const tile = rack[rackIndex];
    if (!tile) return;
    if (isOccupied(game.board, position)) return;
    if (pendingAt(pending, position)) return;
    // Make sure this rackIndex isn't already used by a pending placement.
    if (pending.some((p) => p.rackIndex === rackIndex)) return;

    let placed: PlacedTile;
    let needsLetter = false;
    if (tile.kind === "blank") {
      placed = { kind: "blank", letter: "A", value: 0 };
      needsLetter = true;
    } else {
      placed = { kind: "letter", letter: tile.letter, value: tile.value };
    }
    const next = [...pending, { position, tile: placed, rackIndex }];
    set({
      pending: next,
      pendingBlankAt: needsLetter ? position : null,
      error: null,
    });
  },

  recallOne: (position) => {
    const { pending } = get();
    set({
      pending: pending.filter(
        (p) => !(p.position.row === position.row && p.position.col === position.col),
      ),
      error: null,
    });
  },

  setBlankLetter: (letter) => {
    const { pending, pendingBlankAt } = get();
    if (!pendingBlankAt) return;
    const next = pending.map((p) =>
      p.position.row === pendingBlankAt.row && p.position.col === pendingBlankAt.col
        ? {
            ...p,
            tile: { kind: "blank" as const, letter, value: 0 as const },
          }
        : p,
    );
    set({ pending: next, pendingBlankAt: null });
  },

  cancelBlankPicker: () => {
    const { pending, pendingBlankAt } = get();
    if (!pendingBlankAt) return;
    set({
      pending: pending.filter(
        (p) =>
          !(p.position.row === pendingBlankAt.row && p.position.col === pendingBlankAt.col),
      ),
      pendingBlankAt: null,
    });
  },
}));

/** For tests: derive the current player's rack as displayed (post rack-order). */
export function visibleRack(
  rack: ReadonlyArray<Tile>,
  rackOrder: ReadonlyArray<number>,
): ReadonlyArray<{ tile: Tile; rackIndex: number }> {
  return rackOrder
    .filter((i) => i < rack.length)
    .map((i) => ({ tile: rack[i]!, rackIndex: i }));
}

/** Exported for testing. */
export const __internal = { formatError, tilesAreEquivalent, cellKey };
