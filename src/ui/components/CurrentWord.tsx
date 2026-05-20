import { tokens } from "../tokens.js";
import { Tile } from "./Tile.js";

export interface CurrentWordProps {
  /** Letters being composed; empty string / array shows the dashed empty state. */
  readonly word: string;
  /** Custom placeholder text for the empty state. */
  readonly hint?: string;
  /** Tile size in px. Defaults to 56 — fits 6-7 tiles comfortably on iPad. */
  readonly tileSize?: number;
}

/**
 * Display strip for the word being composed in Tumbler and Spelling Bee.
 * Empty state is a dashed rounded panel with a hint; populated state
 * lays out cream tiles in a row with a 6 px gap.
 *
 * The 80 px min-height keeps both states the same size so the layout
 * doesn't jump when the user types the first letter.
 */
export function CurrentWord({
  word,
  hint = "Tap rack tiles to build a word",
  tileSize = 56,
}: CurrentWordProps): JSX.Element {
  const { color, radius, space, size, shadow } = tokens;
  const letters = word.split("");

  if (letters.length === 0) {
    return (
      <div
        style={{
          height: 80,
          display: "grid",
          placeItems: "center",
          color: color.inkSoft,
          fontSize: size.body,
          border: `2px dashed ${color.stroke}`,
          borderRadius: radius.card,
          padding: space.x4,
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
        padding: space.x3,
        background: color.paper,
        border: `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        boxShadow: shadow.card,
        minHeight: 80,
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
