import { useState } from "react";
import { playUiTap } from "../../audio/sounds.js";

/**
 * One menu row on the redesigned HomeScreen. Cards variant per spec:
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │  ▢   Label                                  ›       │
 *   │      Sublabel                                       │
 *   └─────────────────────────────────────────────────────┘
 *
 * Three columns (grid auto 1fr auto): icon chip · label/sublabel · chevron.
 *
 * The primary variant (used for "Resume game" when a saved game exists)
 * gets a filled brown gradient + cream text + a beefier shadow stack so
 * it visually dominates the list — the same hierarchy NYT and others use
 * to signal "the obvious next thing to do".
 */
export interface MenuItemProps {
  readonly icon: string;
  readonly label: string;
  readonly sublabel?: string;
  readonly primary?: boolean;
  /** Optional `disabled` look + behaviour (Resume when no save exists). */
  readonly disabled?: boolean;
  readonly onClick: () => void;
}

export function MenuItem({
  icon,
  label,
  sublabel,
  primary = false,
  disabled = false,
  onClick,
}: MenuItemProps): JSX.Element {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  // Secondary "card" style + primary "filled brown" style. Hover toggles
  // a deeper shadow and (for cards) a darker border. Press collapses the
  // -1px translate back to 0 so the button feels physically pushed.
  const base: React.CSSProperties = primary
    ? {
        background:
          hover
            ? "linear-gradient(180deg, color-mix(in oklab, #6F4423 86%, white 14%) 0%, color-mix(in oklab, #6F4423 96%, black 4%) 100%)"
            : "linear-gradient(180deg, color-mix(in oklab, #6F4423 92%, white 8%) 0%, #6F4423 100%)",
        color: "#F1E5CF",
        border: "1.5px solid #56341A",
        padding: "20px 18px",
        fontSize: 19,
        boxShadow:
          "0 1px 0 rgba(255,220,180,.18) inset, 0 -2px 0 rgba(0,0,0,.18) inset, 0 12px 26px -14px rgba(60,30,0,.55)",
      }
    : {
        background: "#FFFFFF",
        color: "#2A1A0C",
        border: `1.5px solid ${hover ? "#8E5E37" : "#C9B48E"}`,
        padding: "16px 18px",
        fontSize: 17,
        boxShadow: hover
          ? "0 1px 0 rgba(255,255,255,.7) inset, 0 4px 10px rgba(60,30,0,.10), 0 18px 36px -16px rgba(60,30,0,.28)"
          : "0 1px 0 rgba(255,255,255,.7) inset, 0 1px 2px rgba(60,30,0,.06), 0 8px 22px -12px rgba(60,30,0,.18)",
      };

  // Icon-chip colours invert on the primary row (translucent white on
  // brown vs translucent brown on cream).
  const iconStyle: React.CSSProperties = primary
    ? {
        background: "rgba(255,255,255,.16)",
        color: "#F1E5CF",
      }
    : {
        background: "color-mix(in oklab, #6F4423 10%, transparent)",
        color: "#6F4423",
      };

  return (
    <button
      type="button"
      onClick={
        disabled
          ? undefined
          : () => {
              playUiTap();
              onClick();
            }
      }
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPressed(false);
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        appearance: "none",
        ...base,
        borderRadius: 14,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        font: "inherit",
        fontWeight: 600,
        fontSize: base.fontSize,
        // Spec transition: transform .12s ease, shadow .2s, bg/border .2s.
        transition:
          "transform .12s ease, box-shadow .2s ease, background .2s ease, border-color .2s ease",
        transform:
          pressed ? "translateY(0)" : hover && !disabled ? "translateY(-1px)" : "translateY(0)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        // iPad touch tuning — manipulation disables double-tap-zoom on
        // these tap targets which would otherwise feel sluggish.
        touchAction: "manipulation",
      }}
    >
      {/* Icon chip — 36×36, rounded, with a faint accent fill. */}
      <span
        aria-hidden
        style={{
          width: 36,
          height: 36,
          display: "grid",
          placeItems: "center",
          borderRadius: 10,
          fontSize: 16,
          flexShrink: 0,
          ...iconStyle,
        }}
      >
        {icon}
      </span>

      {/* Body — label + optional sublabel stacked. min-width: 0 lets the
          label ellipsize cleanly inside the grid track. */}
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontWeight: 600, letterSpacing: "-0.005em" }}>{label}</span>
        {sublabel && (
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              letterSpacing: "0.02em",
              color: primary
                ? "color-mix(in oklab, #F1E5CF 78%, transparent)"
                : "#6B5641",
            }}
          >
            {sublabel}
          </span>
        )}
      </span>

      {/* Chevron — slides 2 px to the right on hover. */}
      <span
        aria-hidden
        style={{
          display: "grid",
          placeItems: "center",
          color: primary
            ? hover
              ? "#F1E5CF"
              : "color-mix(in oklab, #F1E5CF 75%, transparent)"
            : hover
              ? "#6F4423"
              : "color-mix(in oklab, #6F4423 55%, transparent)",
          transform: hover ? "translateX(2px)" : "translateX(0)",
          transition: "transform .15s ease, color .2s ease",
        }}
      >
        <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <path
            d="M6 3l5 5-5 5"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
