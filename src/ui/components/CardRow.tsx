import type { CSSProperties, ReactNode } from "react";
import { playUiTap } from "../../audio/sounds.js";
import { tokens } from "../tokens.js";

export interface CardRowProps {
  /** Icon block on the left — typically an `<IconChip>`. */
  readonly icon?: ReactNode;
  readonly title: string;
  /** Secondary line below the title. Optional. */
  readonly sub?: string;
  /**
   * What appears on the right — defaults to a chevron. Pass any node to
   * override (e.g. star-rating row in the difficulty picker).
   */
  readonly trailing?: ReactNode;
  /** Hero / primary variant — brown gradient like the primary Button. */
  readonly primary?: boolean;
  /** Selected state — currently used in the difficulty picker. */
  readonly selected?: boolean;
  /** Hide the default chevron entirely (e.g. when the row isn't navigational). */
  readonly hideChevron?: boolean;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
  readonly ariaLabel?: string;
  readonly style?: CSSProperties;
}

/**
 * Pill-shaped row used in menus AND stat lists — the design's single
 * card pattern. Layout is a 3-col grid: icon · text-block · trailing.
 *
 * Three visual variants:
 *   - primary  — hero CTA (brown gradient, cream text). Used for "Resume game".
 *   - selected — outlined card with thicker brown border. Used for the
 *                currently-picked option in radio-style pickers.
 *   - default  — white card with soft warm shadow + cream stroke.
 *
 * The chevron is rendered inline — no extra dependency — so the icon
 * pack stays empty. Override with `trailing` if you need a status chip,
 * star rating, etc. on the right.
 */
export function CardRow({
  icon,
  title,
  sub,
  trailing,
  primary,
  selected,
  hideChevron,
  disabled,
  onClick,
  ariaLabel,
  style,
}: CardRowProps): JSX.Element {
  const { color, shadow, radius, space, motion, size, weight } = tokens;

  const visual: CSSProperties = primary
    ? {
        background: `linear-gradient(180deg, color-mix(in oklab, ${color.brown} 92%, white 8%) 0%, ${color.brown} 100%)`,
        color: color.cream,
        border: `1.5px solid ${color.brownDark}`,
        boxShadow: shadow.primary,
      }
    : selected
      ? {
          background: color.paper,
          color: color.ink,
          border: `2px solid ${color.brown}`,
          boxShadow: shadow.cardHover,
        }
      : {
          background: color.paper,
          color: color.ink,
          border: `1.5px solid ${color.stroke}`,
          boxShadow: shadow.card,
        };

  const trailingNode = trailing ?? (!hideChevron && <Chevron primary={primary} />);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        playUiTap();
        onClick?.();
      }}
      style={{
        appearance: "none",
        font: "inherit",
        textAlign: "left",
        padding: primary ? "20px 22px" : "16px 20px",
        borderRadius: radius.card,
        display: "grid",
        // 3-col grid keeps icon left, text fills the middle, trailing
        // sticks to the right regardless of title length.
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: space.x4,
        cursor: disabled ? "not-allowed" : "pointer",
        width: "100%",
        minHeight: 64,
        opacity: disabled ? 0.45 : 1,
        transition: `transform ${motion.fast}, box-shadow ${motion.normal}, border-color ${motion.normal}`,
        touchAction: "manipulation",
        ...visual,
        ...style,
      }}
    >
      {icon ?? <span />}
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontWeight: weight.med,
            fontSize: primary ? size.bodyLg : size.body,
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </span>
        {sub && (
          <span
            style={{
              fontSize: size.micro + 1,
              color: primary
                ? `color-mix(in oklab, ${color.cream} 78%, transparent)`
                : color.inkSoft,
              fontWeight: weight.reg,
              letterSpacing: ".02em",
            }}
          >
            {sub}
          </span>
        )}
      </span>
      {trailingNode}
    </button>
  );
}

interface ChevronProps {
  // `exactOptionalPropertyTypes` rejects implicit `undefined` on optional
  // boolean props — type as union explicitly so the call site can pass
  // an `undefined` parent-prop directly without intermediate guards.
  readonly primary?: boolean | undefined;
}

function Chevron({ primary }: ChevronProps): JSX.Element {
  const color = primary
    ? `color-mix(in oklab, ${tokens.color.cream} 75%, transparent)`
    : `color-mix(in oklab, ${tokens.color.brown} 55%, transparent)`;
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden style={{ color }}>
      <path
        d="M6 3l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
