import { createEmptyBoard, placeTiles } from "../board.js";
import { CLASSIC_BOARD } from "../config/board.js";
import { DEFAULT_RULES } from "../config/rules.js";
import type {
  Board,
  CellKey,
  GameState,
  PlacedTile,
  Position,
  Rack,
  Tile,
  TileBag,
} from "../types.js";

/** Create a letter tile (rack form). */
export const T = (letter: string, value = 1): Tile => ({
  kind: "letter",
  letter: letter as "A",
  value,
});

/** Create a placed letter tile. */
export const PT = (letter: string, value = 1): PlacedTile => ({
  kind: "letter",
  letter: letter as "A",
  value,
});

/** A rack-form blank tile. */
export const BLANK: Tile = { kind: "blank", value: 0 };

/** A placed blank tile with chosen letter. */
export const BLANK_AS = (letter: string): PlacedTile => ({
  kind: "blank",
  letter: letter as "A",
  value: 0,
});

export interface MakeStateOpts {
  readonly board?: Board;
  readonly rack0?: Rack;
  readonly rack1?: Rack;
  readonly score0?: number;
  readonly score1?: number;
  readonly turn?: number;
  readonly bag?: TileBag;
  readonly consecutivePasses?: number;
  readonly consumedPremiums?: ReadonlySet<CellKey>;
  readonly ended?: boolean;
}

/** Build a minimal Classic GameState for tests. */
export function makeState(opts: MakeStateOpts = {}): GameState {
  const board = opts.board ?? createEmptyBoard(CLASSIC_BOARD);
  return {
    seed: 1,
    boardConfig: CLASSIC_BOARD,
    rules: DEFAULT_RULES,
    board,
    bag: opts.bag ?? [],
    players: [
      { name: "P1", rack: opts.rack0 ?? [], score: opts.score0 ?? 0 },
      { name: "P2", rack: opts.rack1 ?? [], score: opts.score1 ?? 0 },
    ],
    turn: opts.turn ?? 0,
    consecutivePasses: opts.consecutivePasses ?? 0,
    consumedPremiums: opts.consumedPremiums ?? new Set<CellKey>(),
    history: [],
    status: opts.ended ? { kind: "ended", reason: { kind: "consecutive_passes" } } : { kind: "in_progress" },
  };
}

/** Place tiles on the Classic empty board. */
export function boardWith(placements: ReadonlyArray<{ position: Position; tile: PlacedTile }>): Board {
  return placeTiles(createEmptyBoard(CLASSIC_BOARD), placements);
}
