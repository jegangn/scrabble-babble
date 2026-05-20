import type { CSSProperties, ReactNode, MouseEventHandler } from "react";
import { playUiTap } from "../../audio/sounds.js";
import { tokens } from "../tokens.js";

/**
 * Button "kind" — visual + semantic role. Every interactive button in
 * the app picks one of these; one-off styles are a regression.
 *
 * - `primary`     — brown gradient with bevel shadow. The hero action
 *                   on a screen (Start game, Play again, Submit).
 * - `secondary`   — white card with stroke. Everything else.
 * - `destructive` — white with red outline + red text. Resign, End game.
 * - `ghost`       — transparent with brown text. Tertiary cancels.
 */
export type ButtonKind = "primary" | "secondary" | "destructive" | "ghost";

/**
 * Size tier. Determines padding + minimum height. All sizes meet the
 * design's 44 px tap-min on the short side.
 */
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  readonly kind?: ButtonKind;
  readonly size?: ButtonSize;
  /** Optional icon (SVG / Unicode glyph) rendered to the left of children. */
  readonly icon?: ReactNode;
  readonly children: ReactNode;
  /** Stretch to full container width. */
  readonly full?: boolean;
  readonly disabled?: boolean;
  /**
   * Suppress the soft tap-tick sound. Default: false (sound plays). Set
   * to true when the button has its own action-specific sound (e.g. the
   * Submit button plays a success sound; we don't want both).
   */
  readonly muted?: boolean;
  readonly onClick?: () => void;
  readonly type?: "button" | "submit" | "reset";
  readonly ariaLabel?: string;
  readonly style?: CSSProperties;
}

interface Palette {
  readonly background: string;
  readonly color: string;
  readonly border: string;
  readonly boxShadow: string;
}

function palette(kind: ButtonKind): Palette {
  const { color, shadow } = tokens;
  switch (kind) {
    case "primary":
      // Two-stop top-highlight gradient on the brown — the only place
      // (besides tiles) that uses a gradient. Keeps the brand identity.
      return {
        background: `linear-gradient(180deg, color-mix(in oklab, ${color.brown} 92%, white 8%) 0%, ${color.brown} 100%)`,
        color: color.cream,
        border: `1.5px solid ${color.brownDark}`,
        boxShadow: shadow.primary,
      };
    case "destructive":
      return {
        background: color.paper,
        color: color.danger,
        border: `1.5px solid ${color.danger}`,
        boxShadow: shadow.card,
      };
    case "ghost":
      return {
        background: "transparent",
        color: color.brown,
        border: "1.5px solid transparent",
        boxShadow: "none",
      };
    case "secondary":
    default:
      return {
        background: color.paper,
        color: color.ink,
        border: `1.5px solid ${color.stroke}`,
        boxShadow: shadow.card,
      };
  }
}

function dims(size: ButtonSize): { padding: string; fontSize: number; minHeight: number } {
  const { size: sz } = tokens;
  switch (size) {
    case "lg":
      return { padding: "20px 28px", fontSize: sz.bodyLg, minHeight: 64 };
    case "sm":
      return { padding: "10px 16px", fontSize: sz.caption, minHeight: 44 };
    case "md":
    default:
      return { padding: "14px 22px", fontSize: sz.body, minHeight: 56 };
  }
}

/**
 * The canonical button for the design system. Plays a soft tap tick on
 * activation unless `muted` is set (used when the action has its own
 * sound). All transitions complete in ≤ 200 ms per the motion tokens.
 */
export function Button({
  kind = "secondary",
  size = "md",
  icon,
  children,
  full,
  disabled,
  muted,
  onClick,
  type = "button",
  ariaLabel,
  style,
}: ButtonProps): JSX.Element {
  const p = palette(kind);
  const d = dims(size);

  const handleClick: MouseEventHandler<HTMLButtonElement> = () => {
    if (disabled) return;
    if (!muted) playUiTap();
    onClick?.();
  };

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      onClick={handleClick}
      disabled={disabled}
      style={{
        appearance: "none",
        font: "inherit",
        fontSize: d.fontSize,
        fontWeight: tokens.weight.med,
        padding: d.padding,
        minHeight: d.minHeight,
        borderRadius: tokens.radius.card,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: tokens.space.x3,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        width: full ? "100%" : undefined,
        transition: `transform ${tokens.motion.fast}, box-shadow ${tokens.motion.normal}, background ${tokens.motion.normal}`,
        letterSpacing: "-0.005em",
        whiteSpace: "nowrap",
        touchAction: "manipulation",
        ...p,
        ...style,
      }}
    >
      {icon && (
        <span aria-hidden style={{ display: "inline-flex" }}>
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
