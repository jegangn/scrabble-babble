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
  // LAYOUT NOTE: a 1.4em letter centered in a ~48 px board cell extends to
  // within 2–3 px of every edge. Letters with low-right ink (N's leg, W's
  // peaks, B's bowl, R's tail) used to overlap the value digit in the
  // bottom-right corner. Two changes keep them visually separated:
  //
  //   1. The letter is shifted up ~12 % via translateY so its visual centre
  //      is at ~40 % of the cell height, leaving the bottom 30 % clear.
  //   2. The value sits in its own absolute box with percentage-based
  //      offsets, so it scales with the cell rather than being fixed to a
  //      3 px corner that gets covered when the cell is large.
  //
  // The size+weight bump on the value also makes it readable for the
  // older target user without distracting from the main letter.
  return (
    <div
      className="relative flex items-center justify-center rounded-md select-none font-bold w-full h-full"
      style={style}
    >
      <span
        style={{
          fontSize: "1.35em",
          lineHeight: 1,
          transform: "translateY(-12%)",
        }}
      >
        {displayLetter}
      </span>
      {tile.kind === "letter" && (
        <span
          className="absolute"
          style={{
            right: "9%",
            bottom: "5%",
            fontSize: "0.55em",
            lineHeight: 1,
            color: TILE.value,
            fontWeight: 700,
          }}
        >
          {displayValue}
        </span>
      )}
    </div>
  );
}
