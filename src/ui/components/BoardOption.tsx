import { playUiTap } from "../../audio/sounds.js";
import type { Variant } from "../../engine/types.js";
import { tokens } from "../tokens.js";

export interface BoardOptionProps {
  readonly variant: Variant;
  readonly label: string;
  readonly sub: string;
  readonly selected?: boolean;
  readonly onSelect: () => void;
}

/**
 * Board-picker card on the New Game screen. Compact label-only card
 * (the mini-thumbnail preview was dropped — its 3×3 schematic didn't
 * accurately convey what the real 15×15 / 11×11 boards look like).
 *
 * Three cards per row, all the same shape. Selected state thickens the
 * border to 2 px brown + bumps the shadow to the hover tier.
 */
export function BoardOption({
  variant: _variant,
  label,
  sub,
  selected,
  onSelect,
}: BoardOptionProps): JSX.Element {
  const { color, radius, shadow, space, size, weight } = tokens;
  return (
    <button
      type="button"
      onClick={() => {
        if (selected) return;
        playUiTap();
        onSelect();
      }}
      aria-pressed={selected}
      style={{
        appearance: "none",
        font: "inherit",
        textAlign: "left",
        background: color.paper,
        border: selected ? `2px solid ${color.brown}` : `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        padding: `${space.x3}px ${space.x4}px`,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        cursor: selected ? "default" : "pointer",
        boxShadow: selected ? shadow.cardHover : shadow.card,
        touchAction: "manipulation",
      }}
    >
      <span style={{ fontWeight: weight.med, fontSize: size.body, color: color.ink }}>
        {label}
      </span>
      <span style={{ fontSize: size.micro + 1, color: color.inkSoft }}>
        {sub}
      </span>
    </button>
  );
}
