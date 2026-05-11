import { TILE } from "../theme.js";
import type { PlacedTile, Tile as TileT } from "../../engine/types.js";

export interface TileProps {
  readonly tile: PlacedTile | TileT;
  readonly pending?: boolean;
  readonly size?: number;
}

export function Tile({ tile, pending = false, size }: TileProps): JSX.Element {
  let displayLetter = "?";
  let displayValue = 0;
  if (tile.kind === "letter") {
    displayLetter = tile.letter;
    displayValue = tile.value;
  } else if ("letter" in tile) {
    displayLetter = tile.letter;
    displayValue = 0;
  } else {
    displayLetter = "_";
    displayValue = 0;
  }
  const style: React.CSSProperties = {
    background: pending ? TILE.bgPending : TILE.bg,
    border: `2px solid ${TILE.border}`,
    color: TILE.letter,
    boxShadow: "0 1px 0 rgba(0,0,0,.2)",
  };
  if (size) {
    style.width = size;
    style.height = size;
  }
  return (
    <div
      className="relative flex items-center justify-center rounded-md select-none font-bold w-full h-full"
      style={style}
    >
      <span style={{ fontSize: "1.4em", lineHeight: 1 }}>{displayLetter}</span>
      {tile.kind === "letter" && (
        <span
          className="absolute"
          style={{
            right: 3,
            bottom: 1,
            fontSize: "0.55em",
            color: TILE.value,
            fontWeight: 600,
          }}
        >
          {displayValue}
        </span>
      )}
    </div>
  );
}
