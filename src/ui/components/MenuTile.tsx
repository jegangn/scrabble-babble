/**
 * Decorative Scrabble-tile component used by the new HomeScreen — both
 * the SCRABBLE / BABBLE hero word-rows and the small "S" mark in the
 * footer. Kept SEPARATE from `Tile.tsx` (which is the in-game playable
 * tile rendered on the board): different gradient stops, different
 * serif font, different point-value position. Mixing them would force
 * either component to accept compromise styling.
 *
 * Design tokens used here are inlined from `design_handoff_scrabble_menu/`
 * — they don't appear in `theme.ts` because nothing else in the app
 * uses them, and exposing them globally would tempt accidental drift
 * from the game's existing ACCENT palette.
 */

/** Standard English Scrabble point values. */
const TILE_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1,
  M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4,
  X: 8, Y: 4, Z: 10,
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
  const fontPx = Math.round(size * 0.58);
  const ptPx = Math.max(9, Math.round(size * 0.22));
  const radius = Math.max(6, Math.round(size * 0.13));
  const value = TILE_VALUES[letter];

  const isBrown = variant === "brown";
  const background = isBrown
    ? "linear-gradient(165deg, #875632 0%, #6F4423 60%, #5A3818 100%)"
    : "linear-gradient(165deg, #F8EBD0 0%, #EBD7AE 65%, #E2C896 100%)";
  const color = isBrown ? "#F1E5CF" : "#2A1A0C";
  // Two distinct shadow stacks per variant — gives each surface its own
  // depth read (cream gets a soft warm bottom shadow, brown gets a darker
  // recessed look).
  const boxShadow = isBrown
    ? "0 1px 0 rgba(255,210,160,.18) inset, 0 -2px 0 rgba(0,0,0,.20) inset, 0 2px 3px rgba(60,30,0,.22)"
    : "0 1px 0 rgba(255,255,255,.55) inset, 0 -2px 0 rgba(120,80,40,.18) inset, 0 2px 3px rgba(60,30,0,.14)";

  return (
    <div
      style={{
        position: "relative",
        display: "grid",
        placeItems: "center",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: radius,
        background,
        color,
        boxShadow,
        fontFamily: 'Georgia, "Iowan Old Style", "Apple Garamond", serif',
        fontWeight: 700,
        userSelect: "none",
      }}
    >
      <span style={{ display: "block", fontSize: fontPx, lineHeight: 1, transform: "translateY(-3%)" }}>
        {letter}
      </span>
      {showValue && value != null && (
        <span
          style={{
            position: "absolute",
            right: "12%",
            bottom: "8%",
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontWeight: 600,
            fontSize: ptPx,
            lineHeight: 1,
            opacity: 0.82,
          }}
        >
          {value}
        </span>
      )}
    </div>
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
