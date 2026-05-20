import type { ReactNode, CSSProperties } from "react";
import { tokens } from "../tokens.js";

export interface SurfaceProps {
  readonly children: ReactNode;
  /** Padding inside the surface — defaults to the 32 px design value. */
  readonly padding?: number | string;
  /** Toggle the paper-grain dot pattern. Defaults to on. */
  readonly grain?: boolean;
  /** Fill the entire viewport. Defaults to true (screens take the full app shell). */
  readonly fill?: boolean;
  readonly style?: CSSProperties;
}

/**
 * Screen artboard wrapper — cream paper background, optional paper-grain
 * dot texture, and a flex column layout for the screen's content.
 *
 * Every screen mounts inside one of these. The grain is rendered as a
 * separate absolutely-positioned div (`pointer-events: none`) so it
 * never intercepts taps; opacity is held at the token-defined 0.35 to
 * keep the cream surface dominant.
 *
 * The screen is positioned `relative` so absolutely-positioned children
 * (BackPill, UserChip, FooterMark) anchor against it, not the viewport.
 */
export function Surface({
  children,
  padding = tokens.space.x8,
  grain = true,
  fill = true,
  style,
}: SurfaceProps): JSX.Element {
  return (
    <div
      style={{
        position: "relative",
        ...(fill ? { width: "100%", minHeight: "100%" } : {}),
        background: tokens.color.cream,
        color: tokens.color.ink,
        fontFamily: tokens.font.sans,
        overflow: "hidden",
        ...style,
      }}
    >
      {grain && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: tokens.grain.opacity,
            backgroundImage: tokens.grain.image,
            backgroundSize: tokens.grain.size,
            backgroundPosition: tokens.grain.position,
          }}
        />
      )}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding,
          display: "flex",
          flexDirection: "column",
          minHeight: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}
