import { useMemo } from "react";
import { scorePlaceMove } from "../../engine/scorer.js";
import { validatePlaceMove } from "../../engine/validator.js";
import type { GameState } from "../../engine/types.js";
import type { TrieNode } from "../../engine/dictionary.js";
import { pendingToMove } from "../../store/pending.js";
import type { PendingPlacement } from "../../store/pending.js";

/**
 * Computes the word + projected score for tiles placed but not yet submitted.
 * Returns:
 *   - { word, score: number } when the placement is a legal move,
 *   - { word, score: null }   when letters are placed but not (yet) legal,
 *   - null                    when nothing is pending.
 */
export function usePendingPreview(
  game: GameState | null,
  pending: ReadonlyArray<PendingPlacement>,
  dictionary: TrieNode | null,
): { word: string; score: number | null } | null {
  return useMemo(() => {
    if (pending.length === 0 || !game || !dictionary) return null;
    const move = pendingToMove(pending);
    const validation = validatePlaceMove(game, move, dictionary);
    if (!validation.ok) {
      // Best-effort: show the letters the user has placed, sorted by
      // board POSITION (not insertion order) so the preview reads as
      // the word the user actually sees forming on the board. E.g.
      // dropping A→R→I→S vertically should show "ARIS", not the order
      // in which the tiles were dragged ("ISA" etc).
      const allSameRow = pending.every(
        (p) => p.position.row === pending[0]!.position.row,
      );
      const allSameCol = pending.every(
        (p) => p.position.col === pending[0]!.position.col,
      );
      const sorted = [...pending].sort((a, b) => {
        if (allSameRow) return a.position.col - b.position.col;
        if (allSameCol) return a.position.row - b.position.row;
        return (
          a.position.row - b.position.row || a.position.col - b.position.col
        );
      });
      const partial = sorted
        .map((p) =>
          p.tile.kind === "letter"
            ? p.tile.letter
            : "letter" in p.tile && typeof p.tile.letter === "string"
              ? p.tile.letter
              : "?",
        )
        .join("");
      return { word: partial, score: null as number | null };
    }
    const score = scorePlaceMove(game, move);
    // ScoreResult.mainWord is a WordScore object — destructure to the
    // string + use the result's total.
    return { word: score.mainWord.word, score: score.total as number | null };
  }, [pending, game, dictionary]);
}
