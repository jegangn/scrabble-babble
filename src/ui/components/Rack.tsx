import type { Tile as TileT } from "../../engine/types.js";
import { ACCENT, TILE } from "../theme.js";
import { Tile } from "./Tile.js";

export interface RackProps {
  readonly rack: ReadonlyArray<TileT>;
  readonly rackOrder: ReadonlyArray<number>;
  readonly usedIndices: ReadonlySet<number>;
  readonly onTileTap?: (rackIndex: number) => void;
  readonly selectedIndex?: number | null;
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
      className="flex gap-2 items-center justify-center p-3 rounded-xl"
      style={{ background: ACCENT.primary }}
    >
      {rackOrder.map((rackIndex) => {
        const tile = rack[rackIndex];
        const used = usedIndices.has(rackIndex);
        const selected = rackIndex === selectedIndex;
        return (
          <button
            key={rackIndex}
            type="button"
            onClick={() => onTileTap?.(rackIndex)}
            className="rounded-md"
            style={{
              width: 64,
              height: 64,
              padding: 0,
              opacity: used ? 0.25 : 1,
              outline: selected ? `3px solid ${TILE.bgPending}` : "none",
              outlineOffset: 2,
              touchAction: "manipulation",
              background: "transparent",
              border: "none",
            }}
            disabled={!tile || used}
            aria-label={
              tile
                ? tile.kind === "letter"
                  ? `Tile ${tile.letter}`
                  : "Blank tile"
                : "Empty slot"
            }
          >
            {tile && <Tile tile={tile} />}
          </button>
        );
      })}
    </div>
  );
}
