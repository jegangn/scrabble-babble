import { cellKey, getCell } from "./board.js";
import type { ExtractedWord } from "./move.js";
import { extractWords } from "./move.js";
import type {
  CellKey,
  GameState,
  PlaceMove,
  PlacedTile,
  ScoreResult,
  WordScore,
} from "./types.js";

/**
 * Score a place move against the current game state.
 *
 * Rules:
 * - Letter premiums (DL/TL) multiply the tile's letter value before summing.
 * - Word premiums (DW/TW) multiply the entire word total.
 * - Premiums only apply to cells being placed in THIS move AND not already in
 *   `state.consumedPremiums`.
 * - Blanks contribute 0 to the letter sum regardless of chosen letter.
 * - Bingo bonus is added when all `rules.rackSize` tiles are placed in one move.
 *
 * Throws if called on a move that doesn't form a valid word (validator should
 * have rejected earlier).
 */
export function scorePlaceMove(state: GameState, move: PlaceMove): ScoreResult {
  const words = extractWords(state.board, move.placements);
  if (!words) {
    throw new Error("scorePlaceMove: move forms no word; validator should have rejected");
  }

  const placementsByKey = new Map<CellKey, PlacedTile>();
  for (const p of move.placements) placementsByKey.set(cellKey(p.position), p.tile);

  const scoreWord = (word: ExtractedWord): WordScore => {
    let wordMultiplier = 1;
    let letterSum = 0;
    for (const pos of word.positions) {
      const key = cellKey(pos);
      const placed = placementsByKey.get(key);
      const tile: PlacedTile = placed ?? getCell(state.board, pos).tile!;
      const isNewPlacement = placed !== undefined;
      const premiumActive = isNewPlacement && !state.consumedPremiums.has(key);
      let letterMultiplier = 1;
      if (premiumActive) {
        const premium = getCell(state.board, pos).premium;
        switch (premium) {
          case "DL":
            letterMultiplier = 2;
            break;
          case "TL":
            letterMultiplier = 3;
            break;
          case "DW":
            wordMultiplier *= 2;
            break;
          case "TW":
            wordMultiplier *= 3;
            break;
          case "NONE":
            break;
        }
      }
      letterSum += tile.value * letterMultiplier;
    }
    return {
      word: word.letters,
      score: letterSum * wordMultiplier,
      positions: word.positions,
    };
  };

  const mainWord = scoreWord(words.main);
  const crossWords = words.crosses.map(scoreWord);
  const wordSum = mainWord.score + crossWords.reduce((s, w) => s + w.score, 0);
  const bingo = move.placements.length === state.rules.rackSize;
  const total = wordSum + (bingo ? state.rules.bingoBonus : 0);

  return { total, mainWord, crossWords, bingo };
}

/**
 * Total value of tiles remaining in a rack. Used for end-game rack-out scoring.
 */
export function rackValue(rack: ReadonlyArray<PlacedTile | { readonly value: number }>): number {
  let sum = 0;
  for (const tile of rack) sum += tile.value;
  return sum;
}
