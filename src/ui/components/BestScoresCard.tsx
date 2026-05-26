import { useState } from "react";
import { tokens } from "../tokens.js";
import { SectionLabel } from "./SectionLabel.js";
import type { BestScoresEntry } from "../utils/best-entries.js";

export interface BestScoresCardProps {
  readonly entries: ReadonlyArray<BestScoresEntry>;
  /** Highlight rows where the entry name matches (case-insensitive trim). */
  readonly currentPlayerName?: string | null;
  /** When > entries[0].score (the saved best), the card shows a
   *  "New high — up X" sub-line under the header. */
  readonly liveScore?: number | undefined;
}

/**
 * Shared compact-collapsed / scroll-expanded best-scores card used by all
 * four solo playing screens (TumblerScreen, SpellingBeeScreen,
 * PhoneTumbler, PhoneSpellingBee).
 *
 *   Collapsed: one row — "Best · <#1 score>" + chevron. If entries is
 *   empty, shows "Best · —" and the toggle is disabled (no list to reveal).
 *
 *   Expanded: same header (chevron flipped) + a scrollable top-10 list
 *   (rank · name · date · score). Rows whose name matches currentPlayerName
 *   (case-insensitive trim) get a highlighted background.
 *
 *   "New high — up X" sub-label appears when liveScore > best.
 *
 * Self-managed expand state. The card doesn't read game state — the
 * caller passes already-adapted entries (`BestScoresEntry[]`) and the
 * live score.
 */
export function BestScoresCard({
  entries,
  currentPlayerName,
  liveScore,
}: BestScoresCardProps): JSX.Element {
  const { color, radius, shadow, space, font, size, weight } = tokens;
  const [expanded, setExpanded] = useState(false);

  const best = entries[0]?.score ?? 0;
  const hasEntries = entries.length > 0;
  const beating = typeof liveScore === "number" && liveScore > best;
  const headlineText = hasEntries ? `${best}` : "—";

  const normalizedCurrent =
    typeof currentPlayerName === "string"
      ? currentPlayerName.trim().toLowerCase()
      : null;

  return (
    <div
      style={{
        background: color.paper,
        border: `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        boxShadow: shadow.card,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={hasEntries ? () => setExpanded((v) => !v) : undefined}
        disabled={!hasEntries}
        aria-expanded={hasEntries ? expanded : undefined}
        aria-label={
          hasEntries
            ? expanded
              ? "Hide top scores"
              : "Show top scores"
            : "No scores yet"
        }
        style={{
          appearance: "none",
          font: "inherit",
          background: "transparent",
          border: "none",
          cursor: hasEntries ? "pointer" : "default",
          padding: `${space.x3}px ${space.x4}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.x3,
          touchAction: "manipulation",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
          <SectionLabel style={{ margin: 0, marginBottom: 0 }}>Best</SectionLabel>
          {beating && hasEntries && (
            <span
              style={{
                fontSize: size.micro + 1,
                color: color.success,
                fontWeight: weight.med,
              }}
            >
              New high — up {(liveScore ?? 0) - best}
            </span>
          )}
        </div>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: space.x2,
          }}
        >
          <span
            style={{
              fontFamily: font.serif,
              fontWeight: weight.bold,
              fontSize: size.h4,
              color: beating ? color.success : color.brown,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {headlineText}
          </span>
          {hasEntries && (
            <span aria-hidden style={{ fontSize: size.body, color: color.brown }}>
              {expanded ? "▾" : "▸"}
            </span>
          )}
        </span>
      </button>
      {expanded && hasEntries && (
        <ol
          style={{
            listStyle: "none",
            padding: `0 ${space.x4}px ${space.x3}px`,
            margin: 0,
            overflowY: "auto",
            maxHeight: 220,
          }}
        >
          {entries.map((entry, i) => {
            const isYou =
              normalizedCurrent !== null &&
              entry.name.trim().toLowerCase() === normalizedCurrent;
            return (
              <li
                key={`${entry.name}-${entry.dateLabel}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: space.x3,
                  alignItems: "center",
                  padding: "6px 4px",
                  borderRadius: 6,
                  borderBottom:
                    i === entries.length - 1
                      ? "none"
                      : `1px dashed ${color.creamDark}`,
                  background: isYou
                    ? `color-mix(in oklab, ${color.successBg} 60%, transparent)`
                    : "transparent",
                  fontSize: size.body,
                }}
              >
                <span style={{ color: color.inkSoft, minWidth: 18 }}>{i + 1}.</span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: color.ink,
                    fontWeight: isYou ? weight.bold : weight.med,
                  }}
                >
                  {entry.name}
                </span>
                <span
                  style={{
                    fontSize: size.micro + 1,
                    color: color.inkSoft,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {entry.dateLabel}
                </span>
                <span
                  style={{
                    fontFamily: font.serif,
                    fontWeight: weight.bold,
                    fontVariantNumeric: "tabular-nums",
                    color: color.brown,
                    minWidth: 32,
                    textAlign: "right",
                  }}
                >
                  {entry.score}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
