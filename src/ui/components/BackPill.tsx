import type { CSSProperties } from "react";
import { playUiTap } from "../../audio/sounds.js";
import { tokens } from "../tokens.js";

export interface BackPillProps {
  readonly onClick: () => void;
  /** Label after the chevron — defaults to "Home". */
  readonly label?: string;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
}

/**
 * Top-left ← Home pill. Replaces `BackToHomeButton.tsx`.
 *
 * Fixed-position by default; if a screen wraps its content in a
 * non-relatively-positioned container, the parent should anchor this
 * pill via its own `position: relative`. The handoff places it at
 * (top: 24, left: 24) — the `x6` spacing token.
 */
export function BackPill({
  onClick,
  label = "Home",
  ariaLabel,
  style,
}: BackPillProps): JSX.Element {
  const { color, shadow, radius, space, size, weight } = tokens;
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? `Back to ${label}`}
      onClick={() => {
        playUiTap();
        onClick();
      }}
      style={{
        appearance: "none",
        font: "inherit",
        position: "absolute",
        top: space.x6,
        left: space.x6,
        zIndex: 5,
        display: "inline-flex",
        alignItems: "center",
        gap: space.x2,
        padding: "10px 16px 10px 12px",
        background: color.paper,
        color: color.ink,
        border: `1.5px solid ${color.stroke}`,
        borderRadius: radius.pill,
        fontSize: size.body,
        fontWeight: weight.med,
        boxShadow: shadow.card,
        minHeight: 44,
        cursor: "pointer",
        touchAction: "manipulation",
        ...style,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M10 3l-5 5 5 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </button>
  );
}
