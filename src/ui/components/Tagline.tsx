import type { CSSProperties, ReactNode } from "react";
import { tokens } from "../tokens.js";

export interface TaglineProps {
  readonly children: ReactNode;
  readonly style?: CSSProperties;
}

/**
 * Small uppercase caption used under headings — "WORDS, ON YOUR TERMS."
 * style. Pre-set to the design's all-caps + 0.14em letter-spacing +
 * inkSoft colour.
 */
export function Tagline({ children, style }: TaglineProps): JSX.Element {
  const { color, size, weight } = tokens;
  return (
    <p
      style={{
        margin: 0,
        fontSize: size.caption,
        letterSpacing: ".14em",
        textTransform: "uppercase",
        color: color.inkSoft,
        fontWeight: weight.med,
        ...style,
      }}
    >
      {children}
    </p>
  );
}
