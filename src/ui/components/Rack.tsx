import type { Tile as TileT } from "../../engine/types.js";
import { ACCENT } from "../theme.js";
import { DraggableRackTile } from "./DraggableRackTile.js";

export interface RackProps {
  readonly rack: ReadonlyArray<TileT>;
  readonly rackOrder: ReadonlyArray<number>;
  readonly usedIndices: ReadonlySet<number>;
  readonly onTileTap?: ((rackIndex: number) => void) | undefined;
  readonly selectedIndex?: number | null | undefined;
}

export function Rack({
  rack,
  rackOrder,
  usedIndices,
  onTileTap,
  selectedIndex = null,
}: RackProps): JSX.Element {
  return (
    <div
      className="flex flex-wrap gap-2 items-center justify-center p-3 rounded-xl"
      style={{ background: ACCENT.primary }}
    >
      {rackOrder.map((rackIndex) => {
        const tile = rack[rackIndex];
        const used = usedIndices.has(rackIndex);
        if (!tile) {
          return (
            <div
              key={rackIndex}
              style={{ width: 64, height: 64, opacity: 0.25 }}
              aria-label="Empty slot"
            />
          );
        }
        return (
          <DraggableRackTile
            key={rackIndex}
            tile={tile}
            rackIndex={rackIndex}
            disabled={used}
            selected={rackIndex === selectedIndex}
            onTap={() => onTileTap?.(rackIndex)}
          />
        );
      })}
    </div>
  );
}
