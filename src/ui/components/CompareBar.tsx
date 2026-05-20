import { tokens } from "../tokens.js";

export interface CompareBarProps {
  /** Previous best score (rendered as the muted ink-grey bar on top). */
  readonly a: number;
  /** This round's score (rendered as the moss-green bar below). */
  readonly b: number;
  /** Upper-bound for the bar scale. If `b > max`, the bar caps at 100 %. */
  readonly max: number;
}

/**
 * Two stacked horizontal bars used on the Tumbler end screen to compare
 * a previous best (top, ink-muted) against this round's score (bottom,
 * moss-green). The 14 px height + rounded corners give the bars a
 * pleasant pill shape; the cream-dark track keeps them anchored in
 * the cream paper world.
 *
 * Math: each bar is rendered as a percentage of `max`. The bottom bar
 * is allowed to render at 100 % if `b > max` — we never want it to
 * overflow the track and look broken when the player smashes their
 * previous best.
 */
export function CompareBar({ a, b, max }: CompareBarProps): JSX.Element {
  const { color } = tokens;
  const aPct = Math.max(0, Math.min(100, Math.round((a / max) * 100)));
  const bPct = Math.max(0, Math.min(100, Math.round((b / max) * 100)));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          height: 14,
          borderRadius: 7,
          background: color.creamDark,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${aPct}%`,
            background: color.inkMuted,
            borderRadius: 7,
          }}
        />
      </div>
      <div
        style={{
          height: 14,
          borderRadius: 7,
          background: color.creamDark,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${bPct}%`,
            background: color.success,
            borderRadius: 7,
          }}
        />
      </div>
    </div>
  );
}
