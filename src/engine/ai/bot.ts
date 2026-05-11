import { removeFromRack } from "../rack.js";
import { applyMove } from "../game.js";
import { createPassMove, createSwapMove } from "../move.js";
import type { TrieNode } from "../dictionary.js";
import type { GameState, Move, Tile } from "../types.js";
import { createPrng } from "../prng.js";
import type { Prng } from "../prng.js";
import { leaveValue } from "./leave-eval.js";
import { generateMoves } from "./move-generator.js";

export type Difficulty = "easy" | "medium" | "hard";

export interface DecideOptions {
  /** Epoch ms after which the bot must return its best-so-far move. */
  readonly deadline?: number;
  /** Optional PRNG for tie-breaking. Defaults to seed = state.history.length. */
  readonly prng?: Prng;
}

const MIN_SCORE: Record<Difficulty, number> = {
  easy: 5,
  medium: 8,
  hard: 12,
};

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

/**
 * Decide the bot's move for the current turn.
 *
 * - Easy: random valid place; falls back to swap/pass if best score below threshold.
 * - Medium: highest-scoring place move; same fallback.
 * - Hard: highest of `score + leaveValue(rackAfterMove) − 0.4·opponentBestResponse`,
 *   simulated with Medium-style opponent response. Bounded by `options.deadline`.
 */
export function decide(
  state: GameState,
  dict: TrieNode,
  difficulty: Difficulty,
  options: DecideOptions = {},
): Move {
  if (isBlocked(state)) return createPassMove();

  const deadline = options.deadline ?? Number.POSITIVE_INFINITY;
  const prng = options.prng ?? createPrng(state.history.length || 1);

  const candidates = generateMoves(state, dict);
  if (candidates.length === 0) return fallbackMove(state);

  const threshold = MIN_SCORE[difficulty];

  if (difficulty === "easy") {
    if (candidates[0]!.total < threshold) return fallbackMove(state);
    const idx = prng.nextInt(candidates.length);
    return candidates[idx]!.move;
  }

  if (difficulty === "medium") {
    if (candidates[0]!.total < threshold) return fallbackMove(state);
    return candidates[0]!.move;
  }

  // Hard: 1-ply lookahead. Score each candidate by base + leave − weighted opponent reply.
  let best = candidates[0]!;
  let bestUtility = -Infinity;
  // Limit how many we deeply evaluate to stay within deadline.
  const maxToEvaluate = Math.min(candidates.length, 30);

  for (let i = 0; i < maxToEvaluate; i++) {
    if (Date.now() > deadline) break;
    const c = candidates[i]!;
    // Compute rack-after by removing placed tiles from current rack
    const player = state.players[state.turn]!;
    const placedAsRackTiles = c.move.placements.map((p) =>
      p.tile.kind === "blank"
        ? ({ kind: "blank", value: 0 } as Tile)
        : ({ kind: "letter", letter: p.tile.letter, value: p.tile.value } as Tile),
    );
    const rackAfter = removeFromRack(player.rack, placedAsRackTiles) ?? player.rack;
    const leave = leaveValue(rackAfter);

    // Simulate opponent's Medium-style best response on the resulting state
    let opponentBest = 0;
    try {
      const applied = applyMove(state, c.move, dict);
      if (applied.ok) {
        const oppCandidates = generateMoves(applied.state, dict);
        opponentBest = oppCandidates[0]?.total ?? 0;
      }
    } catch {
      // ignore; treat opponent reply as 0
    }

    const utility = c.total + leave - 0.4 * opponentBest;
    if (utility > bestUtility) {
      bestUtility = utility;
      best = c;
    }
  }

  if (best.total < threshold) return fallbackMove(state);
  return best.move;
}
