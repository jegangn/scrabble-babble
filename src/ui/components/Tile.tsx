import type { CSSProperties } from "react";
import type { PlacedTile, Tile as TileT } from "../../engine/types.js";
import { tokens } from "../tokens.js";

/**
 * Visual style of the tile face.
 *
 * - `cream`  — default Scrabble tile. The 165° three-stop gradient gives
 *              the characteristic bevelled look.
 * - `brown`  — inverted variant used in the home-screen hero and a few
 *              accent spots.
 * - `ghost`  — outlined transparent variant used in Swap-picker to show
 *              the deselected state without losing the tile silhouette.
 * - `blank`  — softer cream gradient for the visible "blank" tile face
 *              before the user has picked a letter.
 */
export type TileVariant = "cream" | "brown" | "ghost" | "blank";

export interface TileProps {
  /**
   * Engine tile (letter or blank). Preferred form — the display letter and
   * point value are derived from it. Either this or `letter` must be set.
   */
  readonly tile?: PlacedTile | TileT;
  /** Raw letter override. Used when there's no engine tile, e.g. on the menu hero. */
  readonly letter?: string;
  /** Tile face style. Defaults to `cream`. */
  readonly variant?: TileVariant;
  /** Edge length in px. Defaults to 64 (the iPad rack-tile minimum). */
  readonly size?: number;
  /** Show the point-value subscript. Defaults to true (off for menu hero). */
  readonly showValue?: boolean;
  /**
   * Render the moss-ring "placed-but-uncommitted" treatment. Used for
   * tiles on the board that haven't been submitted yet.
   */
  readonly placed?: boolean;
  /**
   * Back-compat alias for `placed`. The old prop was `pending`; new code
   * should use `placed` to match the handoff naming. Either prop works.
   */
  readonly pending?: boolean;
  readonly style?: CSSProperties;
}

/** Engine-tile → display tuple. */
function deriveFromTile(t: PlacedTile | TileT): { letter: string; value: number | null } {
  if (t.kind === "letter") return { letter: t.letter, value: t.value };
  // Blank tile — `letter` is set once the user picks one on the board.
  if ("letter" in t && typeof t.letter === "string") {
    return { letter: t.letter, value: null }; // blanks score 0; hide digit
  }
  return { letter: "", value: null };
}

/**
 * Scrabble tile — the workhorse component used on the board, in racks,
 * in pickers, and in the menu hero.
 *
 * The proportions follow the handoff: letter sized at 0.58× tile edge,
 * point-value subscript at 0.24× with an 11 px floor (per the design
 * "type values stay readable" rule). The letter is nudged up 3 % so its
 * baseline doesn't collide with the corner digit on letters with low-
 * right ink (N, R, B, W).
 */
export function Tile({
  tile,
  letter,
  variant = "cream",
  size = 64,
  showValue = true,
  placed = false,
  pending = false,
  style,
}: TileProps): JSX.Element {
  // Either `placed` or `pending` triggers the moss ring — kept for
  // back-compat with the older API used by BoardCell / GameScreen.
  const isPlaced = placed || pending;
  // Resolve letter + value from whichever input the caller used.
  let displayLetter = letter ?? "";
  let displayValue: number | null = null;
  if (tile) {
    const d = deriveFromTile(tile);
    displayLetter = d.letter;
    displayValue = d.value;
  }

  const fontPx = Math.round(size * 0.58);
  const ptPx = Math.max(11, Math.round(size * 0.24));
  // Scale the corner radius with the tile so small tiles (footer mark)
  // stay proportionate. Clamped to 6 px so micro tiles aren't fully round.
  const rad = Math.max(6, Math.round(size * 0.13));

  const background = (() => {
    switch (variant) {
      case "brown":
        return tokens.tileGradient.brown;
      case "ghost":
        return "transparent";
      case "blank":
        return "linear-gradient(165deg, #FAF1DC 0%, #EFE0BE 100%)";
      case "cream":
      default:
        return tokens.tileGradient.cream;
    }
  })();

  // Three layered shadows imply physical depth without a backdrop-filter.
  // The `placed` ring overrides the variant shadow because it's the
  // most important signal — "this tile is uncommitted".
  const boxShadow = isPlaced
    ? `0 0 0 2px ${tokens.color.success} inset, ${tokens.shadow.tile}`
    : variant === "brown"
      ? tokens.shadow.tileBrown
      : variant === "ghost"
        ? `inset 0 0 0 1.5px ${tokens.color.brown}`
        : tokens.shadow.tile;

  const ink =
    variant === "brown"
      ? tokens.color.cream
      : variant === "ghost"
        ? tokens.color.brown
        : tokens.color.ink;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: rad,
        background,
        color: ink,
        boxShadow,
        fontFamily: tokens.font.serif,
        fontWeight: tokens.weight.bold,
        display: "grid",
        placeItems: "center",
        userSelect: "none",
        flexShrink: 0,
        ...style,
      }}
    >
      <span style={{ fontSize: fontPx, lineHeight: 1, transform: "translateY(-3%)" }}>
        {displayLetter}
      </span>
      {showValue && displayValue !== null && (
        <span
          style={{
            position: "absolute",
            right: "12%",
            bottom: "8%",
            fontFamily: tokens.font.sans,
            fontWeight: tokens.weight.med,
            fontSize: ptPx,
            lineHeight: 1,
            // Slightly more opaque on brown so the cream digit reads;
            // darker on cream so the brown digit reads.
            opacity: variant === "brown" ? 0.9 : 0.82,
          }}
        >
          {displayValue}
        </span>
      )}
    </div>
  );
}
