import type { CSSProperties, ReactNode } from "react";
import { tokens } from "../tokens.js";

export interface SectionLabelProps {
  readonly children: ReactNode;
  readonly style?: CSSProperties;
}

/**
 * All-caps section header — used above fieldset-style groups (Opponent,
 * Board, Difficulty on the New Game screen, etc.). Same type treatment
 * as Tagline but with a small bottom margin so it sits comfortably
 * above the content it labels.
 */
export function SectionLabel({ children, style }: SectionLabelProps): JSX.Element {
  const { color, size, weight, space } = tokens;
  return (
    <div
      style={{
        fontSize: size.caption,
        letterSpacing: ".14em",
        textTransform: "uppercase",
        color: color.inkSoft,
        fontWeight: weight.med,
        marginBottom: space.x3,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
