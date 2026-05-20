import type { ReactNode } from "react";
import { tokens } from "../tokens.js";

export interface IconChipProps {
  readonly children: ReactNode;
  /** Use the inverted colours (cream on brown) for primary-card rows. */
  readonly primary?: boolean;
  /** Edge length in px. Defaults to 40. */
  readonly size?: number;
}

/**
 * Square icon "chip" used inside CardRow (and a few other places). The
 * background is a translucent brown on cream by default; on primary
 * (brown) cards it flips to a translucent cream-on-brown.
 *
 * Symbols are rendered as text — usually Unicode geometric glyphs
 * (★ ⇅ ⇌ ↑ ↓ ↺ ⌫ ▶ ✦ ⧗ ✷) or inline SVG. Never emoji per the brand
 * "not generic AI aesthetic" rule.
 */
export function IconChip({ children, primary, size = 40 }: IconChipProps): JSX.Element {
  const bg = primary
    ? "rgba(255,255,255,.16)"
    : `color-mix(in oklab, ${tokens.color.brown} 10%, transparent)`;
  const fg = primary ? tokens.color.cream : tokens.color.brown;
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        borderRadius: tokens.radius.chip,
        background: bg,
        color: fg,
        fontSize: Math.round(size * 0.4),
        fontWeight: tokens.weight.med,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}
