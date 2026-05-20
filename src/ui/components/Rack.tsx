import type { Tile as TileT } from "../../engine/types.js";
import { tokens } from "../tokens.js";
import { DraggableRackTile } from "./DraggableRackTile.js";

export interface RackProps {
  readonly rack: ReadonlyArray<TileT>;
  readonly rackOrder: ReadonlyArray<number>;
  readonly usedIndices: ReadonlySet<number>;
  readonly onTileTap?: ((rackIndex: number) => void) | undefined;
  readonly selectedIndex?: number | null | undefined;
}

/**
 * The tile rack — 7 (or fewer) Scrabble tiles arranged on a "brown felt"
 * strip. The strip uses the brand brown with an inset top shadow so it
 * reads as a soft well rather than a flat panel; matches the handoff's
 * `inset 0 2px 6px rgba(0,0,0,.25)` + card shadow.
 *
 * The Rack itself only handles layout + the felt — each tile is a
 * <DraggableRackTile> that owns its own drag / tap behaviour.
 */
export function Rack({
  rack,
  rackOrder,
  usedIndices,
  onTileTap,
  selectedIndex = null,
}: RackProps): JSX.Element {
  const { color, space, radius, shadow } = tokens;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
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
          // Empty rack slot — render a subtle placeholder so the rack
          // doesn't collapse when tiles are placed but not yet committed.
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
