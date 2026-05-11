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
        cursor: disabled ? "default" : "grab",
        opacity: disabled ? 0.25 : isDragging ? 0.0 : 1,
        outline: selected ? `3px solid ${TILE.bgPending}` : "none",
        outlineOffset: 2,
        borderRadius: 6,
        touchAction: "none",
      }}
    >
      <Tile tile={tile} />
    </div>
  );
}
