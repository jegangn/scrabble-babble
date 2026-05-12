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
 */
export function LetterPill({
  letter,
  size = 64,
  center = false,
  selected = false,
  onTap,
  ariaLabel,
}: LetterPillProps): JSX.Element {
  const bg = center ? ACCENT.primary : TILE.bg;
  const fg = center ? "#ffffff" : TILE.letter;
  const borderColor = selected ? ACCENT.primaryHover : TILE.border;
  const borderWidth = selected ? 4 : 2;

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!onTap}
      aria-label={ariaLabel ?? letter}
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
        boxShadow: center ? "0 2px 0 rgba(0,0,0,0.18)" : "none",
      }}
    >
      {letter}
    </button>
  );
}
