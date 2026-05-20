import { useState } from "react";
import { ACCENT, TILE } from "../theme.js";
import type { Letter } from "../../engine/types.js";

export interface LetterPillProps {
  readonly letter: Letter;
  /** Square side length in pixels. Defaults to 64 (minimum iPad touch target). */
  readonly size?: number;
  /** If true, render with the accent-colour fill (Spelling Bee centre). */
  readonly center?: boolean;
  /** If true, render with a thicker outline (selected / pressed feedback). */
  readonly selected?: boolean;
  /** Optional tap handler; if omitted the pill is non-interactive. */
  readonly onTap?: () => void;
  /** Accessible label override. */
  readonly ariaLabel?: string;
}

/**
 * Tappable letter button used by both solo screens. No tile value, no
 * drag, no PlacedTile coupling — keep it simple. Defaults to a 64×64
 * touch target which meets the iPad accessibility minimum.
 *
 * Press feedback: while held, the pill scales down ~6 %, tints toward the
 * accent colour, and gains a slightly thicker border. Older eyes see the
 * cue clearly; younger fingers feel the depressed-button affordance.
 */
export function LetterPill({
  letter,
  size = 64,
  center = false,
  selected = false,
  onTap,
  ariaLabel,
}: LetterPillProps): JSX.Element {
  const [pressed, setPressed] = useState(false);

  // Active visual state combines the "explicit selection" prop with the
  // momentary "currently pressed" gesture state. Both flow into the same
  // accent treatment so the user can't tell them apart visually — which is
  // intentional, they're the same idea (this pill is the user's focus).
  const isHighlighted = pressed || selected;

  // Centre pill (Bee centre) keeps its accent fill at rest; on press it
  // darkens slightly to give some feedback even though it's already filled.
  const bg = center
    ? pressed
      ? ACCENT.primaryHover
      : ACCENT.primary
    : isHighlighted
      ? ACCENT.primary
      : TILE.bg;
  const fg = center || isHighlighted ? "#ffffff" : TILE.letter;
  const borderColor = isHighlighted ? ACCENT.primaryHover : TILE.border;
  const borderWidth = isHighlighted ? 4 : 2;

  // Reset pressed-state in EVERY release path so the highlight never gets
  // stuck (pointer leaves the pill mid-press, browser cancels, etc.).
  const release = () => setPressed(false);

  return (
    <button
      type="button"
      onClick={onTap}
      onPointerDown={onTap ? () => setPressed(true) : undefined}
      onPointerUp={onTap ? release : undefined}
      onPointerLeave={onTap ? release : undefined}
      onPointerCancel={onTap ? release : undefined}
      disabled={!onTap}
      aria-label={ariaLabel ?? letter}
      aria-pressed={pressed || undefined}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: Math.round(size * 0.18),
        fontSize: Math.round(size * 0.45),
        fontWeight: 700,
        cursor: onTap ? "pointer" : "default",
        touchAction: "manipulation",
        userSelect: "none",
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: pressed
          ? "0 1px 0 rgba(0,0,0,0.12)"
          : center
            ? "0 2px 0 rgba(0,0,0,0.18)"
            : "none",
        transform: pressed ? "scale(0.94)" : "scale(1)",
        transition: "transform 80ms ease, background 80ms ease, border-color 80ms ease",
      }}
    >
      {letter}
    </button>
  );
}
