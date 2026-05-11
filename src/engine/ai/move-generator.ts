import { cellKey, getCell, isInBounds } from "../board.js";
import { letterValue } from "../config/tiles.js";
import type { TrieNode } from "../dictionary.js";
import { createPlaceMove } from "../move.js";
import { scorePlaceMove } from "../scorer.js";
import type {
  Board,
  Direction,
  GameState,
  Letter,
  PlacedTile,
  PlaceMove,
  Position,
  Rack,
  ScoreResult,
} from "../types.js";
import type { AnchorSet, CrossChecks } from "./cross-checks.js";
import { computeCrossChecks, findAnchors } from "./cross-checks.js";

/** A single fully-scored legal move. */
export interface CandidateMove {
  readonly move: PlaceMove;
  readonly score: ScoreResult;
  /** Convenience: the score total. */
  readonly total: number;
  /** Convenience: the main word string. */
  readonly mainWord: string;
}

function step(pos: Position, dir: Direction, n: number): Position {
  return dir === "horizontal"
    ? { row: pos.row, col: pos.col + n }
    : { row: pos.row + n, col: pos.col };
}

function computeLeftLimit(
  anchor: Position,
  dir: Direction,
  board: Board,
  anchors: AnchorSet,
): number {
  let limit = 0;
  for (let i = 1; i < board.size; i++) {
    const pos = step(anchor, dir, -i);
    if (!isInBounds(board, pos)) return limit;
    if (getCell(board, pos).tile !== null) return limit;
    if (anchors.has(cellKey(pos))) return limit;
    limit++;
  }
  return limit;
}

function hasFilledLeft(anchor: Position, dir: Direction, board: Board): boolean {
  const pos = step(anchor, dir, -1);
  return isInBounds(board, pos) && getCell(board, pos).tile !== null;
}

interface PrefixSlot {
  readonly rackIdx: number;
  readonly letter: Letter;
  readonly isBlank: boolean;
}

interface SuffixSlot {
  readonly letter: Letter;
  readonly rackIdx: number | null; // null = existing board tile
  readonly isBlank: boolean;
}

interface GenContext {
  readonly board: Board;
  readonly dict: TrieNode;
  readonly rack: Rack;
  readonly anchors: AnchorSet;
  readonly crossChecks: CrossChecks;
  readonly anchor: Position;
  readonly dir: Direction;
  readonly forcedPrefix: ReadonlyArray<Letter>;
  readonly used: Set<number>;
  readonly placedPrefix: PrefixSlot[];
  readonly suffix: SuffixSlot[];
  readonly emit: (placements: ReadonlyArray<{ position: Position; tile: PlacedTile }>) => void;
}

function placedTile(letter: Letter, isBlank: boolean): PlacedTile {
  if (isBlank) return { kind: "blank", letter, value: 0 };
  return { kind: "letter", letter, value: letterValue(letter) };
}

function emitCandidate(ctx: GenContext): void {
  const totalLeft = ctx.forcedPrefix.length + ctx.placedPrefix.length;
  const placements: { position: Position; tile: PlacedTile }[] = [];
  for (let i = 0; i < ctx.placedPrefix.length; i++) {
    // placedPrefix[i] is at offset (i - ctx.placedPrefix.length) — but forcedPrefix
    // (if any) sits before placedPrefix. Forced tiles are not placements.
    const offset = -ctx.placedPrefix.length + i;
    placements.push({
      position: step(ctx.anchor, ctx.dir, offset),
      tile: placedTile(ctx.placedPrefix[i]!.letter, ctx.placedPrefix[i]!.isBlank),
    });
  }
  // Suffix positions start at anchor and march right.
  for (let i = 0; i < ctx.suffix.length; i++) {
    const slot = ctx.suffix[i]!;
    if (slot.rackIdx === null) continue;
    placements.push({
      position: step(ctx.anchor, ctx.dir, i),
      tile: placedTile(slot.letter, slot.isBlank),
    });
  }
  if (placements.length === 0) return;
  ctx.emit(placements);
  void totalLeft;
}

function extendRight(ctx: GenContext, node: TrieNode, offset: number): void {
  const pos = step(ctx.anchor, ctx.dir, offset);
  if (!isInBounds(ctx.board, pos)) {
    if (node.terminal && offset > 0) emitCandidate(ctx);
    return;
  }
  const cell = getCell(ctx.board, pos);
  if (cell.tile !== null) {
    const L = cell.tile.letter;
    const child = node.children.get(L);
    if (!child) return;
    ctx.suffix.push({ letter: L, rackIdx: null, isBlank: false });
    extendRight(ctx, child, offset + 1);
    ctx.suffix.pop();
    return;
  }
  // Empty cell — emit only if we have walked past the anchor (offset > 0). Otherwise
  // the move's word lies entirely to the left of the anchor and doesn't include it.
  if (node.terminal && offset > 0) emitCandidate(ctx);

  const allowed = ctx.crossChecks[pos.row]![pos.col];
  if (!allowed) return; // shouldn't happen for empty cells

  for (const [Lstr, child] of node.children.entries()) {
    const L = Lstr as Letter;
    if (!allowed.has(L)) continue;
    for (let i = 0; i < ctx.rack.length; i++) {
      if (ctx.used.has(i)) continue;
      const tile = ctx.rack[i]!;
      if (tile.kind === "letter") {
        if (tile.letter !== L) continue;
        ctx.used.add(i);
        ctx.suffix.push({ letter: L, rackIdx: i, isBlank: false });
        extendRight(ctx, child, offset + 1);
        ctx.suffix.pop();
        ctx.used.delete(i);
      } else {
        // Blank can be any letter
        ctx.used.add(i);
        ctx.suffix.push({ letter: L, rackIdx: i, isBlank: true });
        extendRight(ctx, child, offset + 1);
        ctx.suffix.pop();
        ctx.used.delete(i);
      }
    }
  }
}

function leftPart(ctx: GenContext, node: TrieNode, remaining: number): void {
  // First, try extending right from the anchor at current prefix length
  extendRight(ctx, node, 0);

  if (remaining === 0) return;

  for (const [Lstr, child] of node.children.entries()) {
    const L = Lstr as Letter;
    for (let i = 0; i < ctx.rack.length; i++) {
      if (ctx.used.has(i)) continue;
      const tile = ctx.rack[i]!;
      if (tile.kind === "letter") {
        if (tile.letter !== L) continue;
        ctx.used.add(i);
        ctx.placedPrefix.push({ rackIdx: i, letter: L, isBlank: false });
        leftPart(ctx, child, remaining - 1);
        ctx.placedPrefix.pop();
        ctx.used.delete(i);
      } else {
        ctx.used.add(i);
        ctx.placedPrefix.push({ rackIdx: i, letter: L, isBlank: true });
        leftPart(ctx, child, remaining - 1);
        ctx.placedPrefix.pop();
        ctx.used.delete(i);
      }
    }
  }
}

function generateForAnchor(
  anchor: Position,
  dir: Direction,
  board: Board,
  dict: TrieNode,
  rack: Rack,
  anchors: AnchorSet,
  crossChecks: CrossChecks,
  emit: GenContext["emit"],
): void {
  let node = dict;
  let forced: Letter[] = [];

  if (hasFilledLeft(anchor, dir, board)) {
    for (let i = 1; i < board.size; i++) {
      const pos = step(anchor, dir, -i);
      if (!isInBounds(board, pos)) break;
      const tile = getCell(board, pos).tile;
      if (!tile) break;
      forced.unshift(tile.letter);
    }
    for (const L of forced) {
      const next = node.children.get(L);
      if (!next) return;
      node = next;
    }
  }

  const ctx: GenContext = {
    board,
    dict,
    rack,
    anchors,
    crossChecks,
    anchor,
    dir,
    forcedPrefix: forced,
    used: new Set(),
    placedPrefix: [],
    suffix: [],
    emit,
  };

  if (forced.length > 0) {
    extendRight(ctx, node, 0);
  } else {
    const leftLimit = computeLeftLimit(anchor, dir, board, anchors);
    leftPart(ctx, dict, leftLimit);
  }
}

/**
 * Enumerate every legal place move from the given game state.
 *
 * Implements Appel & Jacobson (1988) move generation: per anchor cell per
 * direction, walk the trie left of the anchor (free or forced) then extend
 * rightward placing tiles + checking cross-checks.
 *
 * Returns scored CandidateMoves sorted by total score descending.
 */
export function generateMoves(state: GameState, dict: TrieNode): CandidateMove[] {
  const { board } = state;
  const rack = state.players[state.turn]!.rack;
  const anchors = findAnchors(board);
  if (anchors.size === 0) return [];

  const candidates: CandidateMove[] = [];
  const seen = new Set<string>();

  for (const dir of ["horizontal", "vertical"] as const) {
    const crossChecks = computeCrossChecks(board, dict, dir);
    for (const key of anchors) {
      const [r, c] = key.split(",").map(Number);
      const anchor: Position = { row: r!, col: c! };
      generateForAnchor(anchor, dir, board, dict, rack, anchors, crossChecks, (placements) => {
        // Deduplicate identical placement sets (same tile/positions emitted by two anchors)
        const sig = placements
          .slice()
          .sort((a, b) =>
            a.position.row - b.position.row || a.position.col - b.position.col,
          )
          .map((p) => `${p.position.row},${p.position.col}:${p.tile.letter}:${p.tile.kind}`)
          .join("|");
        if (seen.has(sig)) return;
        seen.add(sig);
        const move = createPlaceMove(placements);
        try {
          const score = scorePlaceMove(state, move);
          candidates.push({
            move,
            score,
            total: score.total,
            mainWord: score.mainWord.word,
          });
        } catch {
          // Should not happen — generator is meant to emit legal moves only.
        }
      });
    }
  }
  candidates.sort((a, b) => b.total - a.total);
  return candidates;
}
