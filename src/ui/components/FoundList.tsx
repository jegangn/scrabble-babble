import { tokens } from "../tokens.js";
import { SectionLabel } from "./SectionLabel.js";

export interface FoundListProps {
  /** Words to list. Rendered in uppercase regardless of casing. */
  readonly words: ReadonlyArray<string>;
  /** Section title above the list. Defaults to "Found". */
  readonly title?: string;
  /** Grid columns. Tumbler live uses 4; Tumbler end uses 3 (denser). */
  readonly columns?: number;
  /** Explicit count for the corner badge — defaults to `words.length`. */
  readonly count?: number;
}

/**
 * Found-words card used in Tumbler (during play + on end screen) and
 * Spelling Bee. Each word is a small cream pill with a serif face.
 *
 * The card itself has the standard card shadow + cream stroke; the
 * inner grid sets column count and a 6 px gap that scales gracefully
 * from 4 columns (default) to 3 (denser) without resizing the words.
 */
export function FoundList({
  words,
  title = "Found",
  columns = 4,
  count,
}: FoundListProps): JSX.Element {
  const { color, radius, space, size, weight, font, shadow } = tokens;
  return (
    <div
      style={{
        background: color.paper,
        border: `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        padding: space.x4,
        boxShadow: shadow.card,
        display: "flex",
        flexDirection: "column",
        gap: space.x3,
        minHeight: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <SectionLabel style={{ margin: 0 }}>{title}</SectionLabel>
        <span
          style={{
            fontSize: size.caption,
            color: color.inkSoft,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {count ?? words.length}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 6,
        }}
      >
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              background: color.cream,
              border: `1px solid ${color.strokeSoft}`,
              borderRadius: radius.chip,
              padding: "6px 10px",
              fontSize: size.caption,
              fontWeight: weight.med,
              color: color.ink,
              textAlign: "center",
              fontFamily: font.serif,
              letterSpacing: ".02em",
            }}
          >
            {w.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
