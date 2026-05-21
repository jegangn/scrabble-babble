import { create } from "zustand";
import { disposeBotClient } from "../ai-client/botClient.js";
import { playError, playPlace, playRecall, playSuccess } from "../audio/sounds.js";
import type { Difficulty } from "../engine/ai/bot.js";
import { CLASSIC_BOARD } from "../engine/config/board.js";
import { MINI_BOARD } from "../engine/config/mini-board.js";
import { MINI_TILES } from "../engine/config/mini-tiles.js";
import { generateRandomBoard } from "../engine/config/random-board.js";
import { CLASSIC_TILES } from "../engine/config/tiles.js";
import type { TrieNode } from "../engine/dictionary.js";
import { applyMove, createGame } from "../engine/game.js";
import { cellKey, isOccupied } from "../engine/board.js";
import {
  createPassMove,
  createResignMove,
  createSwapMove,
} from "../engine/move.js";
import { createPrng } from "../engine/prng.js";
import { tilesAreEquivalent } from "../engine/rack.js";
import type {
  BoardConfig,
  GameState,
  Letter,
  Move,
  PlacedTile,
  Position,
  Tile,
  TileDistribution,
  ValidationError,
  Variant,
} from "../engine/types.js";
import {
  clearInProgress,
  pushHistory,
  saveInProgress,
} from "../storage/game-storage.js";
import {
  setCurrentUser as persistCurrentUser,
  setOpponent,
  setPlayerNames,
  setVariant as persistVariant,
} from "../storage/settings-storage.js";
import { pendingAt, pendingToMove } from "./pending.js";
import type { PendingPlacement } from "./pending.js";

/** Who the human plays against. AI carries its difficulty. */
export type Opponent =
  | { readonly kind: "human" }
  | { readonly kind: "ai"; readonly difficulty: Difficulty };

/** Default opponent for first-time players: hot-seat vs another human. */
export const DEFAULT_OPPONENT: Opponent = { kind: "human" };

/** Default variant for first-time players. */
export const DEFAULT_VARIANT: Variant = "classic";

/** Resolve a variant to the (boardConfig, distribution) used by `createGame`. */
function resolveVariant(
  variant: Variant,
  seed: number,
): { boardConfig: BoardConfig; distribution: TileDistribution } {
  switch (variant) {
    case "classic":
      return { boardConfig: CLASSIC_BOARD, distribution: CLASSIC_TILES };
    case "random":
      return {
        boardConfig: generateRandomBoard(createPrng(seed ^ 0x9e3779b9)),
        distribution: CLASSIC_TILES,
      };
    case "mini":
      return { boardConfig: MINI_BOARD, distribution: MINI_TILES };
  }
}

export type Screen =
  | { kind: "loading" }
  | { kind: "home" }
  | { kind: "new_game" }
  | { kind: "game" }
  | { kind: "handoff"; nextPlayerIndex: number }
  | { kind: "game_end" }
  | { kind: "tumbler" }
  | { kind: "tumbler_end"; score: number; foundWords: ReadonlyArray<string> }
  | { kind: "spelling_bee" }
  | { kind: "scores" };

export interface StoreState {
  screen: Screen;
  dictionary: TrieNode | null;
  game: GameState | null;
  pending: ReadonlyArray<PendingPlacement>;
  /** Visual order of tiles in the current player's rack — UI-only. */
  rackOrder: ReadonlyArray<number>;
  settings: { playerNames: [string, string]; opponent: Opponent; variant: Variant };
  /** Index of the AI-controlled player slot in the current game (always 1 today), or null for hot-seat. */
  aiPlayerIndex: number | null;
  /** True while the bot is computing a move; UI shows a thinking overlay. */
  thinking: boolean;
  error: string | null;
  /** A blank tile dropped on the board that needs a chosen letter. */
  pendingBlankAt: Position | null;
  /**
   * The name shown on solo-mode leaderboards. null on first launch — the UI
   * prompts the user to enter a name on Home before any solo mode is played.
   * Persists across sessions via the settings store.
   */
  currentUser: string | null;

  // Init
  setDictionary: (trie: TrieNode) => void;
  setScreen: (screen: Screen) => void;
  setSettings: (names: [string, string]) => void;
  setOpponent: (opponent: Opponent) => void;
  setVariant: (variant: Variant) => void;
  setThinking: (thinking: boolean) => void;
  setCurrentUser: (name: string) => void;
  hydrate: (game: GameState) => void;

  // Game flow
  startNewGame: (names: [string, string], opponent?: Opponent, variant?: Variant) => void;
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
  /**
   * Move a pending tile already on the board to a different empty cell.
   * Used when the user drags a misplaced pending tile to a better spot
   * instead of recalling it to the rack first.
   */
  movePending: (from: Position, to: Position) => void;
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
 * - AI mode → straight back to `game` (no handoff overlay in either direction;
 *   the handoff exists to hide the rack from a second human, which doesn't
 *   apply when one of the seats is the bot).
 * - Hot-seat → `handoff` so the next human picks up the iPad without seeing
 *   the previous player's rack.
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
  const isAiMode = aiIdx !== null;
  set({
    game: nextState,
    pending: [],
    rackOrder: newRackOrder(nextState.players[nextState.turn]!.rack.length),
    // In AI mode there's no second human to "pass the iPad to" — go straight
    // to the game screen in both directions. In hot-seat mode we still show
    // the handoff so the next human picks up without peeking at the rack.
    screen: isAiMode
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
  settings: {
    playerNames: ["Player 1", "Player 2"],
    opponent: DEFAULT_OPPONENT,
    variant: DEFAULT_VARIANT,
  },
  aiPlayerIndex: null,
  thinking: false,
  error: null,
  pendingBlankAt: null,
  currentUser: null,

  setDictionary: (dictionary) => set({ dictionary }),
  setScreen: (screen) => set({ screen, error: null }),
  setSettings: (playerNames) =>
    set((state) => ({ settings: { ...state.settings, playerNames } })),
  setOpponent: (opponent) =>
    set((state) => ({ settings: { ...state.settings, opponent } })),
  setVariant: (variant) =>
    set((state) => ({ settings: { ...state.settings, variant } })),
  setThinking: (thinking) => set({ thinking }),
  setCurrentUser: (name) => {
    const trimmed = name.trim().slice(0, 24);
    if (trimmed.length === 0) return;
    set({ currentUser: trimmed });
    void persistCurrentUser(trimmed);
  },

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

  startNewGame: (names, opponent, variant) => {
    const seed = Date.now() & 0x7fffffff;
    // Computer always plays the second slot in the players list.
    const effectiveNames: [string, string] =
      opponent?.kind === "ai" ? [names[0], "Computer"] : names;
    const resolvedOpponent: Opponent = opponent ?? get().settings.opponent;
    const resolvedVariant: Variant = variant ?? get().settings.variant;
    const { boardConfig, distribution } = resolveVariant(resolvedVariant, seed);
    const game = createGame({
      seed,
      playerNames: effectiveNames,
      variant: resolvedVariant,
      boardConfig,
      distribution,
    });
    void setPlayerNames(names);
    void setOpponent(resolvedOpponent);
    void persistVariant(resolvedVariant);
    void saveInProgress(game);
    set({
      game,
      pending: [],
      rackOrder: newRackOrder(game.players[0]!.rack.length),
      settings: { playerNames: names, opponent: resolvedOpponent, variant: resolvedVariant },
      aiPlayerIndex: resolvedOpponent.kind === "ai" ? 1 : null,
      screen: { kind: "game" },
      error: null,
    });
  },

  goHome: () => {
    // Free the bot Web Worker (and its ~30 MB dictionary trie copy) on every
    // return to Home. Long sessions where the user bounces between Tumbler /
    // Bee / hot-seat games otherwise pin the worker indefinitely; iOS Safari
    // is known to evict background tabs holding live workers, forcing a
    // full reload on return. The next AI game re-spawns lazily — first move
    // costs an extra ~500 ms which is invisible while the user reads the
    // ScoreBar.
    disposeBotClient();
    set({
      screen: { kind: "home" },
      error: null,
      pending: [],
      pendingBlankAt: null,
      thinking: false,
    });
  },

  submitMove: () => {
    const { game, pending, dictionary, screen } = get();
    // RE-ENTRY GUARD: after a successful move the screen flips to "handoff" /
    // "game_end" synchronously, but React hasn't unmounted GameScreen yet.
    // A queued double-tap on iPad fires its handler against the OLD button —
    // refusing here is the only place we can be sure the previous move has
    // landed. (Older users are prone to double-taps; missing this guard let
    // 4 rapid Pass taps end a game prematurely. See gameStore audit.)
    if (screen.kind !== "game") return;
    if (!game || !dictionary) return;
    if (pending.length === 0) {
      set({ error: "Place tiles before submitting." });
      playError();
      return;
    }
    const move = pendingToMove(pending);
    const result = applyMove(game, move, dictionary);
    if (!result.ok) {
      set({ error: formatError(result.error) });
      playError();
      return;
    }
    void saveInProgress(result.state);
    applyPostMoveTransition(result.state, get, set);
    playSuccess();
  },

  recallPending: () => {
    // Only play the recall sound if there were tiles to recall. Calling
    // recallPending on an already-empty pending list shouldn't make noise.
    const hadPending = get().pending.length > 0;
    set({ pending: [], pendingBlankAt: null, error: null });
    if (hadPending) playRecall();
  },

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
    const { game, dictionary, screen } = get();
    if (screen.kind !== "game") return; // re-entry guard, see submitMove
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
    const { game, dictionary, screen } = get();
    // Critical for hot-seat: 4 rapid Pass taps would otherwise end the game
    // (consecutivePasses = 4). After the first Pass, screen flips to
    // "handoff" synchronously but the React unmount hasn't happened yet —
    // a queued double-tap on iPad fires its handler against the old button.
    if (screen.kind !== "game") return;
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
    const { game, dictionary, screen } = get();
    if (screen.kind !== "game") return; // re-entry guard, see submitMove
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
    const { game, dictionary, aiPlayerIndex } = get();
    if (!game || !dictionary) return;
    // Defensive: only apply the bot's move if it really is the bot's turn
    // right now. Guards against React-18 strict-mode double-fire of the AI
    // driver effect, or any future path where two `decide` promises resolve
    // for the same turn.
    if (aiPlayerIndex === null || game.turn !== aiPlayerIndex) return;
    if (game.status.kind !== "in_progress") return;
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
    // Soft "clack" feedback when the tile lands on the cell. Fired AFTER
    // the state set so we never play a sound for a placement that gets
    // rejected by the guards above.
    playPlace();
  },

  movePending: (from, to) => {
    const { game, pending } = get();
    if (!game) return;
    // Find the pending entry being moved. If `from` doesn't match a
    // pending tile, this is a stale event — bail.
    const idx = pending.findIndex(
      (p) => p.position.row === from.row && p.position.col === from.col,
    );
    if (idx === -1) return;
    // Reject moves to the SAME cell (UI no-op), to an occupied COMMITTED
    // cell, or to another PENDING cell. The first two are obvious; the
    // third prevents stacking two pending tiles on one cell.
    if (from.row === to.row && from.col === to.col) return;
    if (isOccupied(game.board, to)) return;
    if (pending.some((p, i) => i !== idx && p.position.row === to.row && p.position.col === to.col)) {
      return;
    }
    // Splice the moved entry to its new position; keep its tile + rackIndex.
    const existing = pending[idx]!;
    const next = [
      ...pending.slice(0, idx),
      { ...existing, position: to },
      ...pending.slice(idx + 1),
    ];
    set({ pending: next, error: null });
    // Same "soft clack" as a fresh placement — it's a placement, just
    // with a re-used rack tile.
    playPlace();
  },

  recallOne: (position) => {
    const { pending } = get();
    // Only play if the position actually had a pending tile — keeps the
    // sound tied to a real action (no silent no-op clicks).
    const hadTile = pending.some(
      (p) => p.position.row === position.row && p.position.col === position.col,
    );
    set({
      pending: pending.filter(
        (p) => !(p.position.row === position.row && p.position.col === position.col),
      ),
      error: null,
    });
    if (hadTile) playRecall();
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
    // Cancelling the blank picker yanks the just-placed tile back off the
    // board → same audio cue as any other recall.
    playRecall();
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
