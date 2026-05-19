import { useDraggable } from "@dnd-kit/core";
import type { Tile as TileT } from "../../engine/types.js";
import { TILE } from "../theme.js";
import { Tile } from "./Tile.js";

export interface DraggableRackTileProps {
  readonly tile: TileT;
  readonly rackIndex: number;
  readonly disabled: boolean;
  readonly selected: boolean;
  readonly onTap: () => void;
}

export function DraggableRackTile({
  tile,
  rackIndex,
  disabled,
  selected,
  onTap,
}: DraggableRackTileProps): JSX.Element {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `rack-${rackIndex}`,
    data: { kind: "rack", rackIndex },
    disabled,
  });

  // NOTE: while dragging, the actual moving tile is rendered inside the
  // <DragOverlay> mounted in GameScreen. The original here fades to a
  // 40% "ghost" footprint so the rack slot is visually held but the user
  // sees their finger carrying the tile.
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onTap}
      role="button"
      tabIndex={0}
      style={{
        width: 64,
        height: 64,
        cursor: disabled ? "default" : isDragging ? "grabbing" : "grab",
        opacity: disabled ? 0.25 : isDragging ? 0.4 : 1,
        outline: selected ? `3px solid ${TILE.bgPending}` : "none",
        outlineOffset: 2,
        borderRadius: 6,
        touchAction: "none",
        transition: "opacity 120ms ease",
      }}
    >
      <Tile tile={tile} />
    </div>
  );
}
