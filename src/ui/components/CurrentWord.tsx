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
  /**
   * The strip's effective max inline width in px. Used to auto-shrink
   * tiles so the longest possible word (15 letters in Tumbler / Bee)
   * fits on a single line instead of wrapping. Defaults to 480 — matches
   * Tumbler's wrapper. Pass the parent's actual `maxWidth` so the math
   * stays accurate if the wrapper changes.
   */
  readonly availableWidth?: number;
  /**
   * Smallest the tile is allowed to shrink to when fitting many letters.
   * Defaults to 18 — letter still ~10 px (0.55 × 18). Bee's 420 px strip
   * needs ≤ 20 px tiles for a 15-letter word; Tumbler's 480 px strip
   * lands at 24 px naturally so this floor doesn't change its rendering.
   */
  readonly minTileSize?: number;
  /**
   * Optional callback fired when the user taps an individual tile in
   * the strip. When provided, each tile becomes a clickable button so
   * the user can remove a specific letter from the middle of the word
   * (not just the last one). Omit for a read-only display.
   */
  readonly onTileTap?: (index: number) => void;
}

const GAP = 6;
const STRIP_HORIZONTAL_PADDING = 24; // space.x3 (12px) × 2 sides

/**
 * Display strip for the word being composed in Tumbler and Spelling Bee.
 * Empty state is a dashed rounded panel with a hint; populated state
 * lays out cream tiles in a row with a 6 px gap.
 *
 * Tiles auto-shrink (down to `minTileSize`) so a 15-letter word stays
 * on a single line — `flex-wrap: nowrap` enforces this and the size
 * calculation guarantees we never overflow horizontally.
 *
 * Both states share the same `stripHeight` so the column doesn't jump
 * when the user types the first letter.
 */
export function CurrentWord({
  word,
  hint = "Tap rack tiles to build a word",
  tileSize = 56,
  stripHeight = 64,
  availableWidth = 480,
  minTileSize = 18,
  onTileTap,
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

  // Fit-to-strip math — for N tiles with GAP between them and the strip's
  // horizontal padding, the largest tile size that doesn't overflow is:
  //   floor((availableWidth − padding − GAP × (N − 1)) / N)
  // Cap by the caller's requested tileSize so short words don't suddenly
  // render huge tiles; floor by minTileSize so a 15-letter word stays
  // legible without wrapping.
  const inner = availableWidth - STRIP_HORIZONTAL_PADDING;
  const fittedSize = Math.floor((inner - GAP * (letters.length - 1)) / letters.length);
  const effectiveSize = Math.max(minTileSize, Math.min(tileSize, fittedSize));

  return (
    <div
      style={{
        display: "flex",
        gap: GAP,
        justifyContent: "center",
        padding: `0 ${space.x3}px`,
        background: color.paper,
        border: `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        boxShadow: shadow.card,
        height: stripHeight,
        alignItems: "center",
        flexWrap: "nowrap",
        overflow: "hidden",
      }}
    >
      {letters.map((ch, i) =>
        onTileTap ? (
          <button
            key={i}
            type="button"
            onClick={() => onTileTap(i)}
            aria-label={`Remove letter ${ch} at position ${i + 1}`}
            style={{
              appearance: "none",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              touchAction: "manipulation",
              flexShrink: 0,
              borderRadius: Math.max(4, Math.round(effectiveSize * 0.14)),
            }}
          >
            <Tile letter={ch} size={effectiveSize} variant="cream" />
          </button>
        ) : (
          <Tile key={i} letter={ch} size={effectiveSize} variant="cream" />
        ),
      )}
    </div>
  );
}
