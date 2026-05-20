import type { CSSProperties } from "react";
import { tokens } from "../tokens.js";
import { Tile } from "./Tile.js";

export interface BeePillProps {
  readonly letter: string;
  /** Centre pill — brown tile, cream letter. Outer pills are cream tiles. */
  readonly center?: boolean;
  /** Highlight as touched / selected — scales down slightly with a moss outline. */
  readonly highlighted?: boolean;
  /** Edge length in px. Defaults to 86 (sized for the SpellingBee hex). */
  readonly size?: number;
  /**
   * Tap handler. Fires on click (release), NOT on pointerdown, so the
   * slide-composition's pointer-move detector on the hex container
   * doesn't double-register the initial pill the user pressed on. The
   * container's onClickCapture suppresses the click when a drag is
   * detected so swipes only register each pill once.
   */
  readonly onTap?: (() => void) | undefined;
  readonly style?: CSSProperties;
}

/**
 * One Bee letter pill — rendered as a Scrabble tile (cream/brown
 * gradient, Domine serif letter, 3D shadow) to match the rest of the
 * app's tile vocabulary. Two variants:
 *
 *   - **center** — brown tile, sits in the middle of the hex. Always
 *     required in a Bee word.
 *   - **outer**  — cream tile, sits on the ring.
 *
 * Highlighted state applies a 0.94× scale + 3 px moss outline on the
 * wrapper (same moss colour as "valid word" feedback elsewhere). The
 * Tile itself is square; the hex layout positions are unaffected.
 */
export function BeePill({
  letter,
  center,
  highlighted,
  size = 86,
  onTap,
  style,
}: BeePillProps): JSX.Element {
  const { color, motion } = tokens;
  return (
    <div
      role={onTap ? "button" : undefined}
      aria-label={onTap ? `Letter ${letter}` : undefined}
      onClick={onTap}
      style={{
        display: "inline-block",
        cursor: onTap ? "pointer" : "default",
        transition: `transform ${motion.fast}`,
        touchAction: "manipulation",
        transform: highlighted ? "scale(0.94)" : "scale(1)",
        outline: highlighted ? `3px solid ${color.success}` : "none",
        outlineOffset: 4,
        borderRadius: Math.max(4, Math.round(size * 0.14)),
        ...style,
      }}
    >
      <Tile
        letter={letter}
        variant={center ? "brown" : "cream"}
        size={size}
        showValue={false}
      />
    </div>
  );
}
