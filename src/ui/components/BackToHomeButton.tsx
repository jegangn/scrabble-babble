import { ACCENT } from "../theme.js";

export interface BackToHomeButtonProps {
  readonly onClick: () => void;
}

/**
 * Shared "← Home" pill. Floats at the top-left of any play screen so
 * users always find the exit in the same place. Absolutely positioned
 * so it doesn't claim any vertical space from the screen's main content;
 * z-index 50 sits above the board / hex / rack but below modals and
 * the drag overlay.
 *
 * Styled to read clearly against any background, including the board's
 * red TW corner: white fill + brown border + small drop-shadow.
 */
export function BackToHomeButton({ onClick }: BackToHomeButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back to home"
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 50,
        background: "white",
        color: ACCENT.text,
        border: `2px solid ${ACCENT.primary}`,
        borderRadius: 999,
        padding: "6px 14px",
        fontSize: "0.95em",
        fontWeight: 600,
        minHeight: 36,
        touchAction: "manipulation",
        cursor: "pointer",
        boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
      }}
    >
      ← Home
    </button>
  );
}
