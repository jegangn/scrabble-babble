/**
 * Core type vocabulary for the Scrabble Babble engine.
 *
 * Conventions:
 * - All structures are deeply readonly.
 * - Discriminated unions use a `kind` field.
 * - Blank tiles are distinct from letter tiles at the type level.
 */

/** The 26 capital letters. Blank tiles do not use this — see {@link Tile}. */
export type Letter =
  | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J"
  | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T"
  | "U" | "V" | "W" | "X" | "Y" | "Z";

/** Premium-square category. `NONE` = ordinary cell. */
export type PremiumType = "NONE" | "DL" | "TL" | "DW" | "TW";

/** Which board variant a game was started with. Determines board + bag. */
export type Variant = "classic" | "random" | "mini";

/** Direction of word placement. A single-tile move is treated as horizontal. */
export type Direction = "horizontal" | "vertical";

/** Zero-based board coordinates. (0,0) is top-left. */
export interface Position {
  readonly row: number;
  readonly col: number;
}

/** Canonical string key for a Position; used as map/set key. */
export type CellKey = `${number},${number}`;

/**
 * A tile as it lives in the bag or rack.
 * - Letter tiles have a fixed letter and value.
 * - Blank tiles have no chosen letter yet and value 0.
 */
export type Tile =
  | { readonly kind: "letter"; readonly letter: Letter; readonly value: number }
  | { readonly kind: "blank"; readonly value: 0 };

/**
 * A tile as it sits on the board.
 * - Letter tiles unchanged.
 * - Blank tiles carry the player-chosen letter; their score value remains 0.
 */
export type PlacedTile =
  | { readonly kind: "letter"; readonly letter: Letter; readonly value: number }
  | { readonly kind: "blank"; readonly letter: Letter; readonly value: 0 };

/** A single cell on the board: its premium category and (optionally) a placed tile. */
export interface BoardCell {
  readonly premium: PremiumType;
  readonly tile: PlacedTile | null;
}

/** The current playable surface. */
export interface Board {
  readonly size: number;
  readonly cells: ReadonlyArray<ReadonlyArray<BoardCell>>;
}

/** Static board configuration. The premium grid must be `size × size`. */
export interface BoardConfig {
  readonly size: number;
  readonly premiums: ReadonlyArray<ReadonlyArray<PremiumType>>;
}

/**
 * One row of the tile distribution table.
 * For blanks, letter is `null` and value is 0.
 */
export interface TileSpec {
  readonly letter: Letter | null;
  readonly count: number;
  readonly value: number;
}

/** Full tile distribution for a variant. */
export type TileDistribution = ReadonlyArray<TileSpec>;

/** Numerical rule constants. */
export interface RulesConfig {
  readonly bingoBonus: number;
  readonly rackSize: number;
  readonly maxConsecutivePasses: number;
  readonly minBagToSwap: number;
}

/** A player's hand. Order is meaningful (UI may preserve it). */
export type Rack = ReadonlyArray<Tile>;

/** Bag of remaining tiles in draw order. The next tile drawn is at index 0. */
export type TileBag = ReadonlyArray<Tile>;

/** Per-player state in a game. */
export interface PlayerState {
  readonly name: string;
  readonly rack: Rack;
  readonly score: number;
}

/** A single tile being placed by a move. */
export interface Placement {
  readonly position: Position;
  readonly tile: PlacedTile;
}

/** Player commits new tiles to the board. */
export interface PlaceMove {
  readonly kind: "place";
  readonly placements: ReadonlyArray<Placement>;
}

/** Player swaps rack tiles back to the bag. */
export interface SwapMove {
  readonly kind: "swap";
  readonly tiles: ReadonlyArray<Tile>;
}

/** Player passes their turn. */
export interface PassMove {
  readonly kind: "pass";
}

/** Player resigns; the game ends immediately. */
export interface ResignMove {
  readonly kind: "resign";
}

/** Any move a player may submit. */
export type Move = PlaceMove | SwapMove | PassMove | ResignMove;

/** A word formed by a move, with its score. */
export interface WordScore {
  readonly word: string;
  readonly score: number;
  readonly positions: ReadonlyArray<Position>;
}

/** Result of scoring a place move. */
export interface ScoreResult {
  readonly total: number;
  readonly mainWord: WordScore;
  readonly crossWords: ReadonlyArray<WordScore>;
  readonly bingo: boolean;
}

/**
 * Discriminated failure modes from move validation.
 * Each branch carries enough detail to render a user-facing message later.
 */
export type ValidationError =
  | { readonly kind: "empty_placement" }
  | { readonly kind: "out_of_bounds"; readonly position: Position }
  | { readonly kind: "cell_already_occupied"; readonly position: Position }
  | { readonly kind: "duplicate_position"; readonly position: Position }
  | { readonly kind: "not_single_line" }
  | { readonly kind: "gap_in_word" }
  | { readonly kind: "first_move_must_cross_center" }
  | { readonly kind: "not_connected_to_existing" }
  | { readonly kind: "blank_missing_letter"; readonly position: Position }
  | { readonly kind: "tile_not_in_rack"; readonly tile: Tile }
  | { readonly kind: "invalid_word"; readonly word: string }
  | { readonly kind: "must_form_word" }
  | { readonly kind: "swap_bag_too_small"; readonly bagSize: number; readonly minimum: number }
  | { readonly kind: "swap_tile_not_in_rack"; readonly tile: Tile }
  | { readonly kind: "game_already_ended" };

/** Validation result for a single move. */
export type MoveValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: ValidationError };

/** Why a game ended. */
export type EndReason =
  | { readonly kind: "rack_out"; readonly playerIndex: number }
  | { readonly kind: "consecutive_passes" }
  | { readonly kind: "resignation"; readonly playerIndex: number };

/**
 * Who won a finished game. A resignation hands the win to the non-resigner
 * regardless of score (never a tie in the two-player game); every other end
 * condition is decided on score, with an equal top score reported as a tie.
 */
export type GameResult =
  | { readonly kind: "winner"; readonly playerIndex: number }
  | { readonly kind: "tie" };

/** A single entry in the move log. */
export interface MoveHistoryEntry {
  readonly move: Move;
  readonly playerIndex: number;
  readonly score: number;
  readonly mainWord: string | null;
}

/**
 * Full game state. All references are immutable; engine functions return new state.
 *
 * `consumedPremiums` records cells whose premium has already been applied so that
 * subsequent moves crossing those cells do not re-apply the bonus.
 */
export interface GameState {
  readonly seed: number;
  readonly variant: Variant;
  readonly boardConfig: BoardConfig;
  readonly rules: RulesConfig;
  readonly board: Board;
  readonly bag: TileBag;
  readonly players: ReadonlyArray<PlayerState>;
  readonly turn: number;
  readonly consecutivePasses: number;
  readonly consumedPremiums: ReadonlySet<CellKey>;
  readonly history: ReadonlyArray<MoveHistoryEntry>;
  readonly status:
    | { readonly kind: "in_progress" }
    | { readonly kind: "ended"; readonly reason: EndReason };
}

/** Successful application of a move. */
export interface GameStepOk {
  readonly ok: true;
  readonly state: GameState;
  readonly score: ScoreResult | null;
}

/** Failed application of a move. State is unchanged. */
export interface GameStepError {
  readonly ok: false;
  readonly error: ValidationError;
}

/** Result of `applyMove`. */
export type GameStepResult = GameStepOk | GameStepError;
