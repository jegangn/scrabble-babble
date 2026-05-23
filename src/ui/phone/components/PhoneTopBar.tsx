import type { ReactNode } from "react";
import { playUiTap } from "../../../audio/sounds.js";
import { tokens } from "../../tokens.js";

export interface PhoneTopBarProps {
  /** Label for the back chevron. If omitted, no back button is shown. */
  readonly onBack?: (() => void) | undefined;
  readonly backLabel?: string | undefined;
  /** Centred title text. */
  readonly title?: string | undefined;
  /** Optional trailing node (e.g. an icon button). */
  readonly trailing?: ReactNode | undefined;
}

/**
 * Slim top bar for phone screens. Optional back chevron + label on the
 * left, centred title, optional trailing node on the right. Uses tokens
 * throughout — no one-off colours.
 */
export function PhoneTopBar({
  onBack,
  backLabel = "Back",
  title,
  trailing,
}: PhoneTopBarProps): JSX.Element {
  const { color, size, weight, space, shadow } = tokens;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        minHeight: 52,
        padding: `${space.x2}px ${space.x4}px`,
        background: tokens.color.cream,
        borderBottom: `1px solid ${color.strokeSoft}`,
        boxShadow: shadow.card,
        position: "relative",
        zIndex: 1,
        flexShrink: 0,
      }}
    >
      {/* Left: back button or empty spacer */}
      <div style={{ display: "flex", alignItems: "center" }}>
        {onBack && (
          <button
            type="button"
            aria-label={`Back to ${backLabel}`}
            onClick={() => {
              playUiTap();
              onBack();
            }}
            style={{
              appearance: "none",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: space.x1,
              color: color.brown,
              fontSize: size.body,
              fontWeight: weight.med,
              padding: `${space.x2}px ${space.x2}px`,
              minHeight: 44,
              touchAction: "manipulation",
            }}
          >
            {/* chevron-left */}
            <svg
              width={16}
              height={16}
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <path
                d="M10 3L5 8l5 5"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{backLabel}</span>
          </button>
        )}
      </div>

      {/* Centre: title — rendered as h1 so getByRole("heading") finds it */}
      {title && (
        <h1
          style={{
            margin: 0,
            color: color.ink,
            fontSize: size.body,
            fontWeight: weight.bold,
            fontFamily: "inherit",
            textAlign: "center",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </h1>
      )}

      {/* Right: trailing node or empty spacer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        {trailing}
      </div>
    </div>
  );
}
