import { tokens } from "../tokens.js";
import { Tile } from "./Tile.js";

export interface TilesLeftProps {
  /** Tiles remaining in the bag. */
  readonly count: number;
}

/**
 * Bag-count pill. A small cream tile glyph next to "{count} left" in
 * the brown ink. Sits next to the match-info tagline at the top of the
 * in-game sidebar so the player always sees how late in the game they
 * are without scrolling history.
 */
export function TilesLeft({ count }: TilesLeftProps): JSX.Element {
  const { color, radius, space, size, weight } = tokens;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: space.x2,
        padding: "6px 12px 6px 6px",
        background: color.paper,
        border: `1.5px solid ${color.stroke}`,
        borderRadius: radius.pill,
        fontSize: size.caption,
        fontWeight: weight.med,
        color: color.ink,
      }}
    >
      <Tile letter="" size={26} variant="cream" showValue={false} />
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{count} left</span>
    </div>
  );
}
