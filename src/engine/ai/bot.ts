import { removeFromRack } from "../rack.js";
import { applyMove } from "../game.js";
import { createPassMove, createSwapMove } from "../move.js";
import type { TrieNode } from "../dictionary.js";
import type { GameState, Move, Tile } from "../types.js";
import { createPrng } from "../prng.js";
import type { Prng } from "../prng.js";
import { leaveValue } from "./leave-eval.js";
import { generateMoves } from "./move-generator.js";
import type { CandidateMove } from "./move-generator.js";

/**
 * Five tiers, friendliest to hardest. UI labels (Friendly, Easygoing, Steady,
 * Sharp, Master) match these IDs verbatim — kept lowercase here so they're
 * safe to use as discriminated-union literals and JSON values.
 */
export type Difficulty =
  | "friendly"
  | "easygoing"
  | "steady"
  | "sharp"
  | "master";

/**
 * Per-tier behaviour parameters. Each tier maps to a distinct play style:
 *
 *  - `maxTilesPlaced` — hard cap on rack-tiles used per move. Friendly = 4
 *    means the bot literally cannot play 5+ tiles (and therefore cannot
 *    bingo). Replaces a brittle "bingo probability" lever.
 *  - `poolSize` — top-K candidates the bot considers. Larger = more variance.
 *  - `pickStyle` — how it picks from the pool: "uniform" treats every move
 *    equally (varied, beginner-feel); "score-weighted" biases toward higher
 *    scores (thoughtful-feel); "top-1" always picks the best.
 *  - `useLeaveEval` — re-rank candidates by score + leave-value of the rack
 *    that would remain after the move. Rewards rack management.
 *  - `useLookahead` — also simulate the opponent's best reply and subtract a
 *    fraction; rewards defence.
 *
 * Migration from legacy 3-tier saves (`easy`/`medium`/`hard`) happens at the
 * settings boundary — see {@link migrateLegacyDifficulty}.
 */
interface TierParams {
  readonly maxTilesPlaced: number; // 1–7; 7 = no cap (rack max)
  readonly poolSize: number;
  readonly pickStyle: "uniform" | "score-weighted" | "top-1";
  readonly useLeaveEval: boolean;
  readonly useLookahead: boolean;
}

const TIER: Record<Difficulty, TierParams> = {
  friendly: {
    maxTilesPlaced: 4,
    poolSize: 15,
    pickStyle: "uniform",
    useLeaveEval: false,
    useLookahead: false,
  },
  easygoing: {
    maxTilesPlaced: 5,
    poolSize: 10,
    pickStyle: "uniform",
    useLeaveEval: false,
    useLookahead: false,
  },
  steady: {
    maxTilesPlaced: 7,
    poolSize: 6,
    pickStyle: "score-weighted",
    useLeaveEval: true,
    useLookahead: false,
  },
  sharp: {
    maxTilesPlaced: 7,
    poolSize: 3,
    pickStyle: "score-weighted",
    useLeaveEval: true,
    useLookahead: true,
  },
  master: {
    maxTilesPlaced: 7,
    poolSize: 1,
    pickStyle: "top-1",
    useLeaveEval: true,
    useLookahead: true,
  },
};

/** Below this, even the best move is bad enough to prefer swap/pass. */
const FALLBACK_SCORE_FLOOR = 5;

/** Pre-Phase-5 (3-tier) values that may exist in saved settings. */
type LegacyDifficulty = "easy" | "medium" | "hard";

/**
 * Map legacy 3-tier IDs to the new 5-tier system. Called by storage on load
 * so the rest of the codebase only ever sees the new type. The mapping is
 * intentionally non-shifting (old Hard ≈ new Sharp, not new Master) — Master
 * is *new* terrain stronger than anything that existed before.
 */
export function migrateLegacyDifficulty(d: string): Difficulty {
  switch (d as LegacyDifficulty | Difficulty) {
    case "easy":
      return "easygoing";
    case "medium":
      return "steady";
    case "hard":
      return "sharp";
    case "friendly":
    case "easygoing":
    case "steady":
    case "sharp":
    case "master":
      return d as Difficulty;
    default:
      return "easygoing";
  }
}

export interface DecideOptions {
  /** Epoch ms after which the bot must return its best-so-far move. */
  readonly deadline?: number;
  /** Optional PRNG for tie-breaking + weighted picks. Default = seeded by history length. */
  readonly prng?: Prng;
}

function isBlocked(state: GameState): boolean {
  return state.status.kind === "ended";
}

function pickLowestLeaveTiles(rack: ReadonlyArray<Tile>, max: number): ReadonlyArray<Tile> {
  const indexed = rack.map((tile, i) => ({
    tile,
    rank: leaveValue([tile]),
    i,
  }));
  indexed.sort((a, b) => a.rank - b.rank);
  return indexed.slice(0, Math.min(max, indexed.length)).map((x) => x.tile);
}

function fallbackMove(state: GameState): Move {
  if (state.bag.length >= state.rules.minBagToSwap) {
    const rack = state.players[state.turn]!.rack;
    const swapTiles = pickLowestLeaveTiles(rack, Math.min(3, rack.length));
    if (swapTiles.length > 0) return createSwapMove(swapTiles);
  }
  return createPassMove();
}

/** Compute leave-value for the rack that would remain after a move. */
function rackLeaveAfter(state: GameState, c: CandidateMove): number {
  const player = state.players[state.turn]!;
  const placedAsRackTiles = c.move.placements.map((p) =>
    p.tile.kind === "blank"
      ? ({ kind: "blank", value: 0 } as Tile)
      : ({ kind: "letter", letter: p.tile.letter, value: p.tile.value } as Tile),
  );
  const rackAfter = removeFromRack(player.rack, placedAsRackTiles) ?? player.rack;
  return leaveValue(rackAfter);
}

/** Best opponent reply, scored greedily (1-ply lookahead). 0 on failure. */
function opponentBestReply(state: GameState, c: CandidateMove, dict: TrieNode): number {
  try {
    const applied = applyMove(state, c.move, dict);
    if (!applied.ok) return 0;
    const opp = generateMoves(applied.state, dict);
    return opp[0]?.total ?? 0;
  } catch {
    return 0;
  }
}

/** Weighted-random index in [0, weights.length); falls back to 0 on degenerate weights. */
function weightedPick(weights: ReadonlyArray<number>, prng: Prng): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return 0;
  let r = prng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]!);
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/**
 * Decide the bot's move for the current turn.
 *
 * Pipeline:
 *  1. Generate all legal moves (Appel–Jacobson generator).
 *  2. Filter by the tier's `maxTilesPlaced` cap.
 *  3. Optionally re-rank by leave-eval and/or 1-ply opponent lookahead.
 *  4. Pick from the top-K pool using the tier's pick style.
 *  5. If the chosen move scores below {@link FALLBACK_SCORE_FLOOR},
 *     swap low-value tiles or pass.
 */
export function decide(
  state: GameState,
  dict: TrieNode,
  difficulty: Difficulty,
  options: DecideOptions = {},
): Move {
  if (isBlocked(state)) return createPassMove();

  const params = TIER[difficulty];
  const deadline = options.deadline ?? Number.POSITIVE_INFINITY;
  const prng = options.prng ?? createPrng(state.history.length || 1);

  const all = generateMoves(state, dict);
  if (all.length === 0) return fallbackMove(state);

  // Apply the tier's hard cap on rack tiles placed.
  const capped = all.filter((c) => c.move.placements.length <= params.maxTilesPlaced);
  if (capped.length === 0) return fallbackMove(state);

  // Optionally re-rank with leave-eval + opponent lookahead. Bounded by
  // `deadline` since lookahead runs a full opponent generator per candidate.
  // We only re-rank the top `poolSize` by base score — extending the rerank
  // pool buys little because base-score ordering is already very tight at
  // the top, and lookahead is O(generateMoves) per candidate.
  const headSize = Math.min(capped.length, Math.max(params.poolSize, 12));
  type Scored = { readonly cand: CandidateMove; readonly utility: number };
  let scored: Scored[];
  if (params.useLeaveEval || params.useLookahead) {
    scored = [];
    for (let i = 0; i < headSize; i++) {
      if (Date.now() > deadline) break;
      const c = capped[i]!;
      const leave = params.useLeaveEval ? rackLeaveAfter(state, c) : 0;
      const oppBest = params.useLookahead ? opponentBestReply(state, c, dict) : 0;
      scored.push({ cand: c, utility: c.total + leave - 0.4 * oppBest });
    }
    // Deadline elapsed before we scored anything → fall back to base-score
    // ordering so we still return a sensible move instead of crashing on an
    // empty pool. (Without this guard, sharp/master can hit an empty `pool`
    // when the worker arrives with a stale deadline.)
    if (scored.length === 0) {
      scored = capped.slice(0, headSize).map((c) => ({ cand: c, utility: c.total }));
    }
    scored.sort((a, b) => b.utility - a.utility);
  } else {
    scored = capped.slice(0, headSize).map((c) => ({ cand: c, utility: c.total }));
  }

  const pool = scored.slice(0, Math.min(params.poolSize, scored.length));

  let chosenIdx: number;
  if (params.pickStyle === "top-1" || pool.length === 1) {
    chosenIdx = 0;
  } else if (params.pickStyle === "uniform") {
    chosenIdx = prng.nextInt(pool.length);
  } else {
    // Score-weighted. Use base scores (not utility — can be negative after
    // leave/lookahead) so weights are always positive and comparable.
    const weights = pool.map((s) => Math.max(1, s.cand.total));
    chosenIdx = weightedPick(weights, prng);
  }

  const chosen = pool[chosenIdx]!.cand;
  if (chosen.total < FALLBACK_SCORE_FLOOR) return fallbackMove(state);
  return chosen.move;
}
