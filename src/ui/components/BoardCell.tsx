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
      }}
    >
      {empty ? (
        isCenter ? (
          <span style={{ color: BOARD.star, fontSize: "1.5em" }}>★</span>
        ) : (
          <span style={{ fontSize: "0.55em", fontWeight: 700 }}>{premium.label}</span>
        )
      ) : (
        <div className="absolute inset-[2px]">
          <Tile tile={cell.tile!} pending={isPending} />
        </div>
      )}
    </button>
  );
}
