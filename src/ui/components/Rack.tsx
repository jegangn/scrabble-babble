import type { Tile as TileT } from "../../engine/types.js";
import { tokens } from "../tokens.js";
import { DraggableRackTile } from "./DraggableRackTile.js";

export interface RackProps {
  readonly rack: ReadonlyArray<TileT>;
  readonly rackOrder: ReadonlyArray<number>;
  readonly usedIndices: ReadonlySet<number>;
  readonly onTileTap?: ((rackIndex: number) => void) | undefined;
  readonly selectedIndex?: number | null | undefined;
  readonly tileSize?: number;
  readonly wrap?: boolean;
}

export function Rack({
  rack,
  rackOrder,
  usedIndices,
  onTileTap,
  selectedIndex = null,
  tileSize = 64,
  wrap = true,
}: RackProps): JSX.Element {
  const { color, space, radius, shadow } = tokens;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: wrap ? "wrap" : "nowrap",
        justifyContent: "center",
        alignItems: "center",
        gap: space.x3,
        padding: `${space.x3}px ${space.x4}px`,
        background: color.brown,
        borderRadius: radius.card,
        boxShadow: `inset 0 2px 6px rgba(0,0,0,.25), ${shadow.card}`,
        touchAction: "manipulation",
      }}
    >
      {rackOrder.map((rackIndex) => {
        const tile = rack[rackIndex];
        const used = usedIndices.has(rackIndex);
        if (!tile) {
          return (
            <div
              key={rackIndex}
              style={{ width: tileSize, height: tileSize, opacity: 0.25 }}
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
            size={tileSize}
          />
        );
      })}
    </div>
  );
}
