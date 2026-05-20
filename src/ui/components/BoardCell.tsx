import { memo } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { BoardCell as BoardCellT, PlacedTile, Position } from "../../engine/types.js";
import { tokens } from "../tokens.js";
import { PREMIUM_COLORS } from "../theme.js";
import {
  BG_CREAM_LIGHT,
  FONT_LETTER,
  FONT_VALUE,
  SHADOW_CREAM_LIGHT,
} from "./Tile.js";

export interface BoardCellProps {
  readonly cell: BoardCellT;
  readonly position: Position;
  readonly isCenter: boolean;
  readonly isPending: boolean;
  /** Board side length (15 for Classic / Random, 11 for Mini). Used to
   *  detect the four corner cells so they can round their outer corner
   *  to match the board container's border-radius. */
  readonly boardSize: number;
  readonly onTap?: ((position: Position) => void) | undefined;
}

/** Standard inner-cell radius. Matches the design handoff. */
const CELL_RADIUS = 3;
/** Outer-corner radius for the four corner cells — board container is
 *  `tokens.radius.card` (14 px) with a 3 px inner gap, so 12 px gives
 *  the corner cell an arc that visually kisses the container's curve. */
const OUTER_CORNER_RADIUS = 12;

/**
 * In-cell tile — renders the placed tile inside its board cell. Uses
 * container-query (`cqi`) units for the letter + point-value sizes so
 * the type scales with the *actual rendered* cell on iPad, iPad Mini,
 * Tab S8, and phone-portrait views without a per-viewport JS measure.
 *
 * Typography matches the alphabet-tile final spec (Domine letter +
 * Atkinson Hyperlegible digit, digit at right 9 % / bottom 7 %,
 * place-items center with no transform). Background + shadow use the
 * spec's lighter (s-32) treatment because board cells run small
 * (~25-55 px on phone → iPad) and the heavy 8-layer treatment looks
 * over-rendered at that scale.
 *
 * `placed` adds the moss inset ring — the "uncommitted" treatment.
 */
function CellTile({ tile, placed }: { readonly tile: PlacedTile; readonly placed: boolean }): JSX.Element {
  const { color } = tokens;
  // Resolve letter + value. Blank tiles render the chosen letter (set
  // when the user picks one) but always show value 0 (suppressed).
  const isLetter = tile.kind === "letter";
  const letter = isLetter
    ? tile.letter
    : "letter" in tile && typeof tile.letter === "string"
      ? tile.letter
      : "";
  const value = isLetter ? tile.value : null;

  // Cell width in cqi: each of 15 cells is ~6.67 % of the board's
  // inline-size, so spec ratios (letter 0.55 × cell, digit 0.17 × cell)
  // become ~3.67 cqi and ~1.13 cqi respectively. Clamps keep the type
  // legible at the extremes (huge external display / tiny phone).
  return (
    <div
      style={{
        position: "absolute",
        // inset:6% gives a small breathing margin inside the cell so the
        // tile reads as "sitting on" the cell rather than filling it edge
        // to edge. The board's 3px gap + this margin = visible separation.
        inset: "6%",
        borderRadius: "14%",
        background: BG_CREAM_LIGHT,
        color: color.ink,
        boxShadow: placed
          ? `inset 0 0 0 2px ${color.success}, ${SHADOW_CREAM_LIGHT}`
          : SHADOW_CREAM_LIGHT,
        display: "grid",
        placeItems: "center",
        userSelect: "none",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontFamily: FONT_LETTER,
          fontWeight: 700,
          fontSize: "min(3.67cqi, 32px)",
          letterSpacing: "-0.01em",
          lineHeight: 1,
          WebkitTextStroke: "0.4px currentColor",
          paintOrder: "stroke fill",
        }}
      >
        {letter}
      </span>
      {value !== null && (
        <span
          style={{
            position: "absolute",
            right: "9%",
            bottom: "7%",
            fontFamily: FONT_VALUE,
            fontWeight: 700,
            // Digit floor at 7 px per spec; cap at 12 px so it stays
            // a quiet subscript even on a very wide board.
            fontSize: "clamp(7px, 1.13cqi, 12px)",
            lineHeight: 1,
            color: color.brown,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function BoardCellInner({
  cell,
  position,
  isCenter,
  isPending,
  boardSize,
  onTap,
}: BoardCellProps): JSX.Element {
  const premium = PREMIUM_COLORS[cell.premium];
  const empty = cell.tile === null;
  // Per-corner radii: only the OUTER corner of each of the four corner
  // cells gets the larger radius; the other three corners stay at the
  // standard cell radius so neighbouring cells stay flush.
  const lastIndex = boardSize - 1;
  const isTopLeft = position.row === 0 && position.col === 0;
  const isTopRight = position.row === 0 && position.col === lastIndex;
  const isBottomLeft = position.row === lastIndex && position.col === 0;
  const isBottomRight = position.row === lastIndex && position.col === lastIndex;
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `cell-${position.row}-${position.col}`,
    data: { kind: "cell", position },
    disabled: !empty,
  });
  const {
    setNodeRef: setDragRef,
    attributes: dragAttributes,
    listeners: dragListeners,
    isDragging,
  } = useDraggable({
    id: `pending-${position.row}-${position.col}`,
    data: { kind: "pending-board", position },
    disabled: !isPending,
  });
  return (
    <button
      ref={setDropRef}
      type="button"
      onClick={onTap ? () => onTap(position) : undefined}
      className="relative flex items-center justify-center"
      style={{
        background: isOver && empty
          ? tokens.color.successBg
          : isCenter && empty
            ? tokens.color.brown
            : premium.bg,
        color: isCenter && empty ? tokens.color.cream : premium.fg,
        border: "none",
        borderTopLeftRadius: isTopLeft ? OUTER_CORNER_RADIUS : CELL_RADIUS,
        borderTopRightRadius: isTopRight ? OUTER_CORNER_RADIUS : CELL_RADIUS,
        borderBottomLeftRadius: isBottomLeft ? OUTER_CORNER_RADIUS : CELL_RADIUS,
        borderBottomRightRadius: isBottomRight ? OUTER_CORNER_RADIUS : CELL_RADIUS,
        minWidth: 0,
        minHeight: 0,
        aspectRatio: "1",
        padding: 0,
        touchAction: "manipulation",
        // Cell label base font (used by the premium-square text below).
        // Tile letters use their own cqi formula in <CellTile>.
        fontSize: "min(2.6cqi, 1.3rem)",
        fontFamily: tokens.font.sans,
        fontWeight: tokens.weight.bold,
        letterSpacing: ".02em",
      }}
    >
      {empty ? (
        isCenter ? (
          // SVG five-point star. The Unicode ★ glyph's visual ink sits
          // asymmetrically inside its em-box (font-dependent) and would
          // not land dead-centre inside the cell. Drawing the star as
          // SVG lets us place its bounding box exactly at the cell's
          // geometric centre. The rotation centre is at (50, 54.3) of
          // the viewBox so the bbox [y=9.3 .. y=90.7] is centred on 50
          // — i.e. the apex sits the same distance from the top edge
          // that the two base V's sit from the bottom edge.
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            style={{
              width: "min(6cqi, 3rem)",
              height: "min(6cqi, 3rem)",
              color: tokens.color.cream,
              display: "block",
            }}
          >
            <path
              fill="currentColor"
              d="M50 9.3 L60.58 39.74 L92.80 40.39 L67.12 59.86 L76.45 90.70 L50 72.30 L23.55 90.70 L32.88 59.86 L7.20 40.39 L39.42 39.74 Z"
            />
          </svg>
        ) : (
          <span style={{ fontSize: "0.85em", fontWeight: 700 }}>
            {premium.label}
          </span>
        )
      ) : isPending ? (
        <div
          ref={setDragRef}
          {...dragAttributes}
          {...dragListeners}
          style={{
            position: "absolute",
            inset: 0,
            cursor: isDragging ? "grabbing" : "grab",
            opacity: isDragging ? 0.4 : 1,
            touchAction: "none",
            transition: "opacity 120ms ease",
          }}
        >
          <CellTile tile={cell.tile!} placed />
        </div>
      ) : (
        <CellTile tile={cell.tile!} placed={false} />
      )}
    </button>
  );
}

/**
 * Memoized so placing one tile doesn't re-render all 225 board cells.
 * Comparator compares `cell` by reference — applyPendingToBoard
 * preserves cell-object identity for unchanged cells.
 */
export const BoardCell = memo(BoardCellInner, (a, b) =>
  a.cell === b.cell &&
  a.position.row === b.position.row &&
  a.position.col === b.position.col &&
  a.isCenter === b.isCenter &&
  a.isPending === b.isPending &&
  a.onTap === b.onTap,
);
