import type { CSSProperties } from "react";
import { tokens } from "../tokens.js";

export interface BeePillProps {
  readonly letter: string;
  /** Centre pill — brown gradient, cream letter. Outer pills are cream. */
  readonly center?: boolean;
  /** Highlight as touched / selected — scales down slightly with a moss outline. */
  readonly highlighted?: boolean;
  /** Edge length in px. Defaults to 110 (the handoff spec for iPad). */
  readonly size?: number;
  /**
   * Click handler. Optional because slide-composition (Bee's primary
   * interaction) uses pointer events on the container, not the pill.
   */
  readonly onTap?: (() => void) | undefined;
  readonly style?: CSSProperties;
}

/**
 * One Bee letter pill. Two visual variants:
 *
 *   - **center** — brown gradient with cream letter; sits in the middle
 *     of the hex. Always required in a Bee word.
 *   - **outer**  — cream gradient with ink letter; sits on the ring.
 *
 * Highlighted state applies a 0.94× scale and a 3 px moss outline with
 * a 4 px offset — the same moss colour used for "valid word" feedback
 * everywhere else.
 */
export function BeePill({
  letter,
  center,
  highlighted,
  size = 110,
  onTap,
  style,
}: BeePillProps): JSX.Element {
  const { color, font, weight, motion } = tokens;

  const background = center
    ? `linear-gradient(165deg, ${color.brownMed} 0%, ${color.brown} 70%)`
    : "linear-gradient(165deg, #F8EBD0 0%, #E2C896 100%)";
  const fg = center ? color.cream : color.ink;
  const boxShadow = center
    ? "0 6px 18px -6px rgba(60,30,0,.45), 0 1px 0 rgba(255,220,180,.18) inset, 0 -2px 0 rgba(0,0,0,.18) inset"
    : "0 4px 12px -4px rgba(60,30,0,.25), 0 1px 0 rgba(255,255,255,.55) inset";

  return (
    <div
      role={onTap ? "button" : undefined}
      aria-label={onTap ? `Letter ${letter}` : undefined}
      onPointerDown={onTap}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background,
        color: fg,
        display: "grid",
        placeItems: "center",
        fontFamily: font.serif,
        fontWeight: weight.heavy,
        fontSize: Math.round(size * 0.5),
        boxShadow,
        cursor: onTap ? "pointer" : "default",
        transition: `transform ${motion.fast}`,
        userSelect: "none",
        touchAction: "manipulation",
        transform: highlighted ? "scale(0.94)" : "scale(1)",
        outline: highlighted ? `3px solid ${color.success}` : "none",
        outlineOffset: 4,
        ...style,
      }}
    >
      {letter}
    </div>
  );
}
