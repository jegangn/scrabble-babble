import { memo } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { BoardCell as BoardCellT, PlacedTile, Position } from "../../engine/types.js";
import { tokens } from "../tokens.js";
import { PREMIUM_COLORS } from "../theme.js";

export interface BoardCellProps {
  readonly cell: BoardCellT;
  readonly position: Position;
  readonly isCenter: boolean;
  readonly isPending: boolean;
  readonly onTap?: ((position: Position) => void) | undefined;
}

/**
 * In-cell tile — renders the placed tile inside its board cell. Uses
 * container-query (`cqi`) units for the letter + point-value sizes so
 * the type scales with the *actual rendered* cell on iPad, iPad Mini,
 * Tab S8, and phone-portrait views without a per-viewport JS measure.
 *
 * Mirrors the handoff Tile spec: 165° cream gradient, three-layered
 * bevel shadow (inset top highlight + inset bottom bevel + warm drop),
 * letter at ~58 % of cell height nudged up 3 % so the bottom-right
 * value digit sits below the letter's baseline.
 *
 * `placed` adds a 2 px moss inset ring — the "uncommitted" treatment.
 */
function CellTile({ tile, placed }: { readonly tile: PlacedTile; readonly placed: boolean }): JSX.Element {
  const { color, font, shadow, tileGradient, weight } = tokens;
  // Resolve letter + value. Blank tiles render the chosen letter (set
  // when the user picks one) but always show value 0 (suppressed).
  const isLetter = tile.kind === "letter";
  const letter = isLetter
    ? tile.letter
    : "letter" in tile && typeof tile.letter === "string"
      ? tile.letter
      : "";
  const value = isLetter ? tile.value : null;

  return (
    <div
      style={{
        position: "absolute",
        // inset:6% gives a small breathing margin inside the cell so the
        // tile reads as "sitting on" the cell rather than filling it edge
        // to edge. The board's 3px gap + this margin = visible separation.
        inset: "6%",
        borderRadius: "14%",
        background: tileGradient.cream,
        color: color.ink,
        boxShadow: placed
          ? `0 0 0 2px ${color.success} inset, ${shadow.tile}`
          : shadow.tile,
        fontFamily: font.serif,
        fontWeight: weight.bold,
        display: "grid",
        placeItems: "center",
        userSelect: "none",
        pointerEvents: "none",
      }}
    >
      {/* Letter — sized at ~5.4cqi (≈ 58 % of a 9.3cqi cell on a 15×15
          board). The min(... rem) clamp keeps the type readable at very
          small viewports without going huge on very wide boards. */}
      <span
        style={{
          fontSize: "min(5.4cqi, 2.6rem)",
          lineHeight: 1,
          transform: "translateY(-4%)",
        }}
      >
        {letter}
      </span>
      {value !== null && (
        <span
          style={{
            position: "absolute",
            right: "12%",
            bottom: "8%",
            fontFamily: font.sans,
            fontWeight: weight.med,
            // Point-value subscript at ~2.2cqi, min 9px so it never
            // disappears on tiny cells.
            fontSize: "max(9px, 2.2cqi)",
            lineHeight: 1,
            opacity: 0.82,
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
  onTap,
}: BoardCellProps): JSX.Element {
  const premium = PREMIUM_COLORS[cell.premium];
  const empty = cell.tile === null;
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
        borderRadius: 3,
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
          <span style={{ color: tokens.color.cream, fontSize: "min(6cqi, 3rem)" }}>★</span>
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
