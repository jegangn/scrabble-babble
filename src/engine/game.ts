import { cellKey, createEmptyBoard, getCell, placeTiles } from "./board.js";
import { CLASSIC_BOARD } from "./config/board.js";
import { DEFAULT_RULES } from "./config/rules.js";
import { CLASSIC_TILES } from "./config/tiles.js";
import type { TrieNode } from "./dictionary.js";
import { placedToRackTile, refillRack, removeFromRack } from "./rack.js";
import { rackValue, scorePlaceMove } from "./scorer.js";
import { createPrng } from "./prng.js";
import { createTileBag, drawTiles, returnTiles } from "./tilebag.js";
import {
  validatePassMove,
  validatePlaceMove,
  validateResignMove,
  validateSwapMove,
} from "./validator.js";
import type {
  BoardConfig,
  CellKey,
  EndReason,
  GameState,
  GameStepResult,
  Move,
  MoveHistoryEntry,
  PassMove,
  PlaceMove,
  PlayerState,
  ResignMove,
  RulesConfig,
  SwapMove,
  TileBag,
  TileDistribution,
  Variant,
} from "./types.js";

/** Options for {@link createGame}. */
export interface CreateGameOptions {
  readonly seed: number;
  readonly playerNames: ReadonlyArray<string>;
  readonly variant?: Variant;
  readonly boardConfig?: BoardConfig;
  readonly rules?: RulesConfig;
  readonly distribution?: TileDistribution;
}

/**
 * Create a fresh game. Each player starts with a full rack drawn from the bag.
 *
 * @example
 * const game = createGame({ seed: 42, playerNames: ["P1", "P2"] });
 */
export function createGame(opts: CreateGameOptions): GameState {
  const boardConfig = opts.boardConfig ?? CLASSIC_BOARD;
  const rules = opts.rules ?? DEFAULT_RULES;
  const distribution = opts.distribution ?? CLASSIC_TILES;
  const prng = createPrng(opts.seed);
  let bag: TileBag = createTileBag(distribution, prng);

  const players: PlayerState[] = [];
  for (const name of opts.playerNames) {
    const { drawn, remaining } = drawTiles(bag, rules.rackSize);
    players.push({ name, rack: drawn, score: 0 });
    bag = remaining;
  }

  return {
    seed: opts.seed,
    variant: opts.variant ?? "classic",
    boardConfig,
    rules,
    board: createEmptyBoard(boardConfig),
    bag,
    players,
    turn: 0,
    consecutivePasses: 0,
    consumedPremiums: new Set<CellKey>(),
    history: [],
    status: { kind: "in_progress" },
  };
}

function withPlayerUpdate(
  players: ReadonlyArray<PlayerState>,
  index: number,
  update: Partial<PlayerState>,
): PlayerState[] {
  return players.map((p, i) => (i === index ? { ...p, ...update } : p));
}

function nextTurn(state: GameState): number {
  return (state.turn + 1) % state.players.length;
}

/**
 * Apply a place move. Caller must have validated.
 * Returns the new state and the score breakdown.
 */
function applyPlaceMove(
  state: GameState,
  move: PlaceMove,
): { state: GameState; score: ReturnType<typeof scorePlaceMove> } {
  const score = scorePlaceMove(state, move);
  const newBoard = placeTiles(state.board, move.placements);

  const consumed = new Set(state.consumedPremiums);
  for (const p of move.placements) {
    const premium = getCell(state.board, p.position).premium;
    if (premium !== "NONE") consumed.add(cellKey(p.position));
  }

  const player = state.players[state.turn]!;
  const rackTiles = move.placements.map((m) => placedToRackTile(m.tile));
  const remainingRack = removeFromRack(player.rack, rackTiles);
  if (!remainingRack) {
    throw new Error("applyPlaceMove: validator should have ensured tiles in rack");
  }
  const refill = refillRack(remainingRack, state.bag, state.rules.rackSize);

  let players: PlayerState[] = withPlayerUpdate(state.players, state.turn, {
    rack: refill.rack,
    score: player.score + score.total,
  });

  const historyEntry: MoveHistoryEntry = {
    move,
    playerIndex: state.turn,
    score: score.total,
    mainWord: score.mainWord.word,
  };

  // End-condition: rack-out
  const rackedOut = refill.rack.length === 0 && refill.bag.length === 0;
  let status: GameState["status"] = { kind: "in_progress" };
  let turn = nextTurn(state);
  if (rackedOut) {
    const winnerIndex = state.turn;
    const loserIndex = (winnerIndex + 1) % state.players.length;
    const loser = players[loserIndex]!;
    const loserRackValue = rackValue(loser.rack);
    players = withPlayerUpdate(players, loserIndex, {
      score: loser.score - loserRackValue,
    });
    players = withPlayerUpdate(players, winnerIndex, {
      score: players[winnerIndex]!.score + loserRackValue,
    });
    status = { kind: "ended", reason: { kind: "rack_out", playerIndex: winnerIndex } };
    turn = state.turn;
  }

  const nextState: GameState = {
    ...state,
    board: newBoard,
    bag: refill.bag,
    players,
    turn,
    consecutivePasses: 0,
    consumedPremiums: consumed,
    history: [...state.history, historyEntry],
    status,
  };

  return { state: nextState, score };
}

function applySwapMove(state: GameState, move: SwapMove): GameState {
  const player = state.players[state.turn]!;
  const without = removeFromRack(player.rack, move.tiles);
  if (!without) throw new Error("applySwapMove: validator should have caught this");

  const prng = createPrng(state.seed ^ state.history.length ^ 0xa5a5a5a5);
  const { drawn, remaining } = drawTiles(state.bag, move.tiles.length);
  const newBag = returnTiles(remaining, move.tiles, prng);
  const newRack = [...without, ...drawn];

  const players = withPlayerUpdate(state.players, state.turn, { rack: newRack });

  return {
    ...state,
    bag: newBag,
    players,
    turn: nextTurn(state),
    consecutivePasses: 0,
    history: [
      ...state.history,
      { move, playerIndex: state.turn, score: 0, mainWord: null },
    ],
  };
}

function applyPassMove(state: GameState, move: PassMove): GameState {
  const consecutive = state.consecutivePasses + 1;
  const ended = consecutive >= state.rules.maxConsecutivePasses;

  let players = state.players;
  let status: GameState["status"] = { kind: "in_progress" };
  if (ended) {
    players = players.map((p) => ({ ...p, score: p.score - rackValue(p.rack) }));
    status = { kind: "ended", reason: { kind: "consecutive_passes" } };
  }

  return {
    ...state,
    players,
    turn: ended ? state.turn : nextTurn(state),
    consecutivePasses: consecutive,
    history: [
      ...state.history,
      { move, playerIndex: state.turn, score: 0, mainWord: null },
    ],
    status,
  };
}

function applyResignMove(state: GameState, move: ResignMove): GameState {
  const reason: EndReason = { kind: "resignation", playerIndex: state.turn };
  return {
    ...state,
    history: [
      ...state.history,
      { move, playerIndex: state.turn, score: 0, mainWord: null },
    ],
    status: { kind: "ended", reason },
  };
}

/**
 * Apply a move to the current state. Validates first; returns either the new
 * state plus score breakdown, or a validation error with the state untouched.
 */
export function applyMove(
  state: GameState,
  move: Move,
  dictionary: TrieNode,
): GameStepResult {
  switch (move.kind) {
    case "place": {
      const validation = validatePlaceMove(state, move, dictionary);
      if (!validation.ok) return { ok: false, error: validation.error };
      const result = applyPlaceMove(state, move);
      return { ok: true, state: result.state, score: result.score };
    }
    case "swap": {
      const validation = validateSwapMove(state, move);
      if (!validation.ok) return { ok: false, error: validation.error };
      return { ok: true, state: applySwapMove(state, move), score: null };
    }
    case "pass": {
      const validation = validatePassMove(state, move);
      if (!validation.ok) return { ok: false, error: validation.error };
      return { ok: true, state: applyPassMove(state, move), score: null };
    }
    case "resign": {
      const validation = validateResignMove(state, move);
      if (!validation.ok) return { ok: false, error: validation.error };
      return { ok: true, state: applyResignMove(state, move), score: null };
    }
  }
}
