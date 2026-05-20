import { useEffect, useRef, useState } from "react";
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
/** How long the highlight visibly persists after pointer-release. */
const HIGHLIGHT_TAIL_MS = 220;

export function LetterPill({
  letter,
  size = 64,
  center = false,
  selected = false,
  onTap,
  ariaLabel,
}: LetterPillProps): JSX.Element {
  const [pressed, setPressed] = useState(false);
  // We keep the press visual ON for HIGHLIGHT_TAIL_MS after the user lifts
  // their finger so the "I just tapped this" cue is unmissable even for
  // a quick tap. Without this tail, a 50 ms touch is gone before older
  // eyes register the change.
  const releaseTimerRef = useRef<number | null>(null);

  // Cancel any in-flight release timer when the component unmounts —
  // otherwise the setTimeout could try to set state on an unmounted
  // component during route changes.
  useEffect(() => {
    return () => {
      if (releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
      }
    };
  }, []);

  const press = () => {
    if (releaseTimerRef.current !== null) {
      window.clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
    setPressed(true);
  };

  const release = () => {
    if (releaseTimerRef.current !== null) {
      window.clearTimeout(releaseTimerRef.current);
    }
    releaseTimerRef.current = window.setTimeout(() => {
      setPressed(false);
      releaseTimerRef.current = null;
    }, HIGHLIGHT_TAIL_MS);
  };

  // Active visual state combines the "explicit selection" prop with the
  // momentary "currently pressed" gesture state. Both flow into the same
  // accent treatment so the user can't tell them apart visually.
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
  // Thick contrast outline when highlighted — uses the pending-tile gold so
  // it stands out against both the white and the accent-brown backgrounds.
  // 5 px (was 4) makes the "I picked this one" cue unmistakable for older
  // users with eyesight problems.
  const borderColor = isHighlighted ? TILE.bgPending : TILE.border;
  const borderWidth = isHighlighted ? 5 : 2;

  return (
    <button
      type="button"
      onClick={onTap}
      onPointerDown={onTap ? press : undefined}
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
          ? "0 0 0 2px rgba(255,225,138,0.5)"
          : center
            ? "0 2px 0 rgba(0,0,0,0.18)"
            : "none",
        transform: pressed ? "scale(0.94)" : "scale(1)",
        transition: "transform 80ms ease, background 80ms ease, border-color 80ms ease, box-shadow 80ms ease",
      }}
    >
      {letter}
    </button>
  );
}
