import { useMemo } from "react";
import type { GameState } from "../../engine/types.js";

/**
 * Pulls the most recent place-move from history.
 * Passes / swaps / resigns don't surface here because there's no word
 * to display. Returns null on the opening turn or when the most recent
 * action wasn't a place.
 */
export function useLastMove(
  game: GameState | null,
): { word: string | null; score: number; name: string } | null {
  return useMemo(() => {
    if (!game) return null;
    for (let i = game.history.length - 1; i >= 0; i--) {
      const entry = game.history[i]!;
      if (entry.move.kind === "place") {
        const player = game.players[entry.playerIndex]!;
        return { word: entry.mainWord, score: entry.score, name: player.name };
      }
    }
    return null;
  }, [game]);
}
