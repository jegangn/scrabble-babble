import type { RulesConfig } from "../types.js";

/** Bonus for using all rack tiles in a single move. */
export const BINGO_BONUS = 35;

/** Tiles in each player's rack at full. */
export const RACK_SIZE = 7;

/** Default board side length for Classic and Random variants. */
export const BOARD_SIZE = 15;

/**
 * Number of consecutive passes after which the game ends.
 * "Both players pass twice in a row" → 4 passes.
 */
export const MAX_CONSECUTIVE_PASSES = 4;

/** Minimum number of tiles that must remain in the bag for a swap to be legal. */
export const MIN_BAG_TO_SWAP = 1;

/** Default rule pack used by Classic 15×15. */
export const DEFAULT_RULES: RulesConfig = {
  bingoBonus: BINGO_BONUS,
  rackSize: RACK_SIZE,
  maxConsecutivePasses: MAX_CONSECUTIVE_PASSES,
  minBagToSwap: MIN_BAG_TO_SWAP,
};
