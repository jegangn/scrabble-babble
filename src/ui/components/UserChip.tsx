import type { CSSProperties } from "react";
import { playUiTap } from "../../audio/sounds.js";
import { tokens } from "../tokens.js";

export interface UserChipProps {
  readonly name: string;
  readonly onClick: () => void;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
}

/**
 * Top-right user pill. Shows the current player's name with a small
 * avatar circle (first letter of their name, serif). Replaces the
 * inline chip that used to live in HomeScreen.
 *
 * The "change user" intent is conveyed by the chevron-less pill shape
 * — tapping anywhere on the chip opens the change-name flow. We don't
 * use a separate edit button because that crowds the corner.
 */
export function UserChip({ name, onClick, style, ariaLabel }: UserChipProps): JSX.Element {
  const { color, shadow, radius, space, size, weight, font } = tokens;
  const initial = name.charAt(0).toUpperCase();
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? `Change user (current: ${name})`}
      onClick={() => {
        playUiTap();
        onClick();
      }}
      style={{
        appearance: "none",
        font: "inherit",
        position: "absolute",
        top: space.x6,
        right: space.x6,
        zIndex: 5,
        display: "inline-flex",
        alignItems: "center",
        gap: space.x2,
        padding: "8px 18px 8px 8px",
        background: color.paper,
        color: color.ink,
        border: `1.5px solid ${color.stroke}`,
        borderRadius: radius.pill,
        fontSize: size.body,
        fontWeight: weight.med,
        boxShadow: shadow.card,
        minHeight: 44,
        maxWidth: 220,
        cursor: "pointer",
        touchAction: "manipulation",
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: color.brownTint,
          color: color.brown,
          display: "grid",
          placeItems: "center",
          fontSize: 14,
          fontWeight: weight.bold,
          fontFamily: font.serif,
          flexShrink: 0,
        }}
      >
        {initial}
      </span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
    </button>
  );
}
