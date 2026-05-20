import { tokens } from "../tokens.js";
import { Tile } from "./Tile.js";

export interface CurrentWordProps {
  /** Letters being composed; empty string / array shows the dashed empty state. */
  readonly word: string;
  /** Custom placeholder text for the empty state. */
  readonly hint?: string;
  /** Tile size in px. Defaults to 56 — fits 6-7 tiles comfortably on iPad. */
  readonly tileSize?: number;
  /** Outer strip height in px. Defaults to 64. Both empty + populated
      states use this so the layout doesn't jump on first keystroke. */
  readonly stripHeight?: number;
}

/**
 * Display strip for the word being composed in Tumbler and Spelling Bee.
 * Empty state is a dashed rounded panel with a hint; populated state
 * lays out cream tiles in a row with a 6 px gap.
 *
 * Both states share the same `stripHeight` so the column doesn't jump
 * when the user types the first letter.
 */
export function CurrentWord({
  word,
  hint = "Tap rack tiles to build a word",
  tileSize = 56,
  stripHeight = 64,
}: CurrentWordProps): JSX.Element {
  const { color, radius, space, size, shadow } = tokens;
  const letters = word.split("");

  if (letters.length === 0) {
    return (
      <div
        style={{
          height: stripHeight,
          display: "grid",
          placeItems: "center",
          color: color.inkSoft,
          fontSize: size.body,
          border: `2px dashed ${color.stroke}`,
          borderRadius: radius.card,
          padding: `0 ${space.x4}px`,
        }}
      >
        {hint}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        justifyContent: "center",
        padding: `0 ${space.x3}px`,
        background: color.paper,
        border: `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        boxShadow: shadow.card,
        height: stripHeight,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {letters.map((ch, i) => (
        <Tile key={i} letter={ch} size={tileSize} variant="cream" />
      ))}
    </div>
  );
}
