import { memo } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { BoardCell as BoardCellT, Position } from "../../engine/types.js";
import { tokens } from "../tokens.js";
import { PREMIUM_COLORS } from "../theme.js";
import { Tile } from "./Tile.js";

export interface BoardCellProps {
  readonly cell: BoardCellT;
  readonly position: Position;
  readonly isCenter: boolean;
  readonly isPending: boolean;
  readonly onTap?: ((position: Position) => void) | undefined;
}

function BoardCellInner({
  cell,
  position,
  isCenter,
  isPending,
  onTap,
}: BoardCellProps): JSX.Element {
  const premium = PREMIUM_COLORS[cell.premium];
  const empty = cell.tile === null;
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `cell-${position.row}-${position.col}`,
    data: { kind: "cell", position },
    disabled: !empty,
  });
  // Pending tiles (placed-but-not-submitted) are draggable: the user can
  // move a misplaced tile to a different cell instead of having to recall
  // it to the rack first. Non-pending committed tiles are NOT draggable —
  // they're locked into the board.
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
        // Centre cell on an empty board is the brown star square; otherwise
        // the premium colour (or cream-step for plain cells). A drop-target
        // highlight tints the moss/success backdrop while the user is
        // dragging a tile over.
        background: isOver && empty
          ? tokens.color.successBg
          : isCenter && empty
            ? tokens.color.brown
            : premium.bg,
        color: isCenter && empty ? tokens.color.cream : premium.fg,
        // Border removed — Board uses a 3 px gap on a brown background to
        // separate cells, per the handoff. A border on top of the gap
        // would double up and look chunky.
        border: "none",
        borderRadius: 3,
        minWidth: 0,
        minHeight: 0,
        aspectRatio: "1",
        padding: 0,
        touchAction: "manipulation",
        // Base font scales with the board container so tile letters + values
        // (rendered by <Tile> in em units) inherit a size proportional to
        // the cell. Older-user eyesight friendly.
        fontSize: "min(3.2cqi, 1.6rem)",
        fontFamily: tokens.font.sans,
        fontWeight: tokens.weight.bold,
        letterSpacing: ".02em",
      }}
    >
      {empty ? (
        isCenter ? (
          // Cream ★ on the brown centre square — matches the brand tile-hero
          // language: cream-on-brown is the inverted treatment.
          <span style={{ color: tokens.color.cream, fontSize: "min(6cqi, 3rem)" }}>★</span>
        ) : (
          // Premium label uses em (≈ 0.7× cell font) — readable at any size.
          <span style={{ fontSize: "0.7em", fontWeight: 700 }}>
            {premium.label}
          </span>
        )
      ) : isPending ? (
        // Pending tile: wrap in the draggable handle. Ghost to 40 % opacity
        // while dragging — the moving tile is rendered by GameScreen's
        // <DragOverlay>, mirroring the rack-tile drag pattern.
        <div
          ref={setDragRef}
          {...dragAttributes}
          {...dragListeners}
          className="absolute inset-[2px]"
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            opacity: isDragging ? 0.4 : 1,
            touchAction: "none",
            transition: "opacity 120ms ease",
          }}
        >
          <Tile tile={cell.tile!} pending />
        </div>
      ) : (
        <div className="absolute inset-[2px]">
          <Tile tile={cell.tile!} pending={false} />
        </div>
      )}
    </button>
  );
}

/**
 * Memoized so placing one tile doesn't re-render all 225 board cells. The
 * comparator compares `cell` by REFERENCE — applyPendingToBoard preserves
 * cell-object identity for unchanged cells, so only the cell whose tile
 * changed gets a fresh reference. `position` is recreated each render in
 * Board.tsx (a fresh literal), so compare row+col by value. The rest are
 * booleans / stable function references.
 *
 * Drag-over highlight (`isOver`) is internal to useDroppable's hook state,
 * not a prop, so React.memo doesn't suppress those updates — that's the
 * desired behaviour (only the hovered cell re-renders during drag).
 */
export const BoardCell = memo(BoardCellInner, (a, b) =>
  a.cell === b.cell &&
  a.position.row === b.position.row &&
  a.position.col === b.position.col &&
  a.isCenter === b.isCenter &&
  a.isPending === b.isPending &&
  a.onTap === b.onTap,
);
