import { useDroppable } from "@dnd-kit/core";
import type { BoardCell as BoardCellT, Position } from "../../engine/types.js";
import { PREMIUM_COLORS, BOARD } from "../theme.js";
import { Tile } from "./Tile.js";

export interface BoardCellProps {
  readonly cell: BoardCellT;
  readonly position: Position;
  readonly isCenter: boolean;
  readonly isPending: boolean;
  readonly onTap?: ((position: Position) => void) | undefined;
}

export function BoardCell({
  cell,
  position,
  isCenter,
  isPending,
  onTap,
}: BoardCellProps): JSX.Element {
  const premium = PREMIUM_COLORS[cell.premium];
  const empty = cell.tile === null;
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${position.row}-${position.col}`,
    data: { kind: "cell", position },
    disabled: !empty,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onTap ? () => onTap(position) : undefined}
      className="relative flex items-center justify-center"
      style={{
        background: isOver && empty ? "#ffe18a" : premium.bg,
        color: premium.fg,
        border: `1px solid ${BOARD.cellBorder}`,
        minWidth: 0,
        minHeight: 0,
        aspectRatio: "1",
        padding: 0,
        touchAction: "manipulation",
        // Base font scales with the board container so tile letters + values
        // (rendered by <Tile> in em units) inherit a size proportional to
        // the cell. Older-user eyesight friendly.
        fontSize: "min(3.2cqi, 1.6rem)",
      }}
    >
      {empty ? (
        isCenter ? (
          // Star scales with the board container so it stays visible on any size.
          <span style={{ color: BOARD.star, fontSize: "min(6cqi, 3rem)" }}>★</span>
        ) : (
          // Premium label uses em (≈ 0.7× cell font) — readable at any size.
          <span style={{ fontSize: "0.7em", fontWeight: 700 }}>
            {premium.label}
          </span>
        )
      ) : (
        <div className="absolute inset-[2px]">
          <Tile tile={cell.tile!} pending={isPending} />
        </div>
      )}
    </button>
  );
}
