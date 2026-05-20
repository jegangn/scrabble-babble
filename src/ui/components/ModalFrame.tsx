import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { tokens } from "../tokens.js";

export interface ModalFrameProps {
  /** Optional click handler for backdrop dismissal. Omit to disable dismissal. */
  readonly onClose?: () => void;
  /** Panel width in px. Defaults to 520. */
  readonly width?: number;
  readonly title: string;
  /** Secondary line under the title. Optional. */
  readonly sub?: string;
  readonly children: ReactNode;
  /** Right-aligned action row at the bottom of the modal. */
  readonly footer?: ReactNode;
  /** Render the title in danger colour — used by the Resign-confirm modal. */
  readonly danger?: boolean;
  /** Optional aria-labelledby override; defaults are generated. */
  readonly ariaLabelledBy?: string;
  readonly style?: CSSProperties;
}

/**
 * Backdrop + centred panel. The dim brown backdrop is `rgba(40, 22, 8, 0.34)`
 * — warmer than a generic black overlay so it sits in the cream world.
 * Replaces the older `Modal.tsx`; the public shape is similar but the
 * structure splits a header / body / footer in line with the handoff
 * spec so every modal in the app shares the same chrome.
 *
 * Click handlers:
 *   - Backdrop tap fires `onClose` only if provided (Resign confirm
 *     omits it because dismissal there must be explicit).
 *   - Panel clicks are stopped from propagating so clicking the
 *     modal contents doesn't bubble up and dismiss.
 *
 * Esc-to-close is handled here too — the spec doesn't require it but
 * keyboard users (e.g. plugged-in iPad keyboard) expect it.
 */
export function ModalFrame({
  onClose,
  width = 520,
  title,
  sub,
  children,
  footer,
  danger,
  ariaLabelledBy,
  style,
}: ModalFrameProps): JSX.Element {
  // Esc-to-close: only when onClose is wired. Detached on unmount.
  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const { color, shadow, radius, space, motion, font, size, weight } = tokens;
  const titleId = ariaLabelledBy ?? "modal-title";

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        // 0.55 opacity gives genuine dimming — the handoff's 0.34 was
        // too light against the cream background to actually dim the
        // game board behind the modal; the modal panel got lost.
        background: "rgba(40, 22, 8, 0.55)",
        display: "grid",
        placeItems: "center",
        padding: space.x4,
        // The modal is presentational — keyboard focus traps would be
        // overkill for an iPad-first app; we just block backdrop scroll.
        overscrollBehavior: "contain",
        animation: `modalFade ${motion.normal} both`,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(100%, " + width + "px)",
          background: color.paper,
          borderRadius: radius.panel,
          border: `1px solid ${color.strokeSoft}`,
          boxShadow: shadow.modal,
          overflow: "hidden",
          animation: `modalRise ${motion.slow} both`,
          ...style,
        }}
      >
        <div
          style={{
            padding: `${space.x6}px ${space.x8}px ${space.x4}px`,
            borderBottom: `1px solid ${color.creamDark}`,
          }}
        >
          <h3
            id={titleId}
            style={{
              margin: 0,
              fontFamily: font.serif,
              fontSize: size.h3,
              fontWeight: weight.bold,
              color: danger ? color.danger : color.ink,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h3>
          {sub && (
            <p
              style={{
                margin: `${space.x2}px 0 0`,
                fontSize: size.body,
                color: color.inkSoft,
              }}
            >
              {sub}
            </p>
          )}
        </div>
        <div style={{ padding: `${space.x6}px ${space.x8}px` }}>{children}</div>
        {footer && (
          <div
            style={{
              display: "flex",
              gap: space.x3,
              justifyContent: "flex-end",
              padding: `${space.x4}px ${space.x8}px ${space.x6}px`,
              borderTop: `1px solid ${color.creamDark}`,
              background: `color-mix(in oklab, ${color.cream} 50%, ${color.paper})`,
            }}
          >
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes modalFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalRise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
