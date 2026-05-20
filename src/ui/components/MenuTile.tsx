import { Tile } from "./Tile.js";

/**
 * Decorative Scrabble-tile component used by HomeScreen for the
 * SCRABBLE / BABBLE hero rows and the small "S" footer mark.
 *
 * Internally delegates to {@link Tile} so menu tiles share the same
 * Domine + Atkinson Hyperlegible typography spec as the rack and
 * board cells — one consistent tile face across the whole app.
 */

/**
 * Tile point values used by the hero rows. Matches the engine's
 * Classic (WWF-inspired) distribution so the menu and in-game tiles
 * never disagree on a letter's score. Hardcoded here so MenuTile
 * doesn't pull engine config purely for a decorative readout.
 */
const TILE_VALUES: Record<string, number> = {
  A: 1, B: 4, C: 4, D: 2, E: 1, F: 4, G: 3, H: 3, I: 1, J: 10, K: 5, L: 2,
  M: 4, N: 2, O: 1, P: 4, Q: 10, R: 1, S: 1, T: 1, U: 2, V: 5, W: 4,
  X: 8, Y: 3, Z: 10,
};

export interface MenuTileProps {
  readonly letter: string;
  /** Side length in px. Hero tiles are 66, menu icons 42, footer 18. */
  readonly size?: number;
  readonly variant?: "cream" | "brown";
  /** Hide the corner point value (footer "S" doesn't show one). */
  readonly showValue?: boolean;
}

export function MenuTile({
  letter,
  size = 66,
  variant = "cream",
  showValue = true,
}: MenuTileProps): JSX.Element {
  const value = TILE_VALUES[letter.toUpperCase()];
  return (
    <Tile
      letter={letter}
      value={value}
      size={size}
      variant={variant}
      showValue={showValue}
    />
  );
}

export interface TileWordProps {
  readonly word: string;
  readonly size?: number;
  readonly variant?: "cream" | "brown";
  readonly gap?: number;
}

/**
 * Render a word as a row of MenuTiles. The handoff allowed for "organic
 * jitter" rotation but the project owner specifically asked the tiles
 * to sit FLAT — no rotation, no Y-lift. Pure horizontal row.
 */
export function TileWord({
  word,
  size = 66,
  variant = "cream",
  gap = 6,
}: TileWordProps): JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap }}>
      {Array.from(word).map((ch, i) => (
        <MenuTile key={i} letter={ch} size={size} variant={variant} />
      ))}
    </div>
  );
}
