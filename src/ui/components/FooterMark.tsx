import type { CSSProperties } from "react";
import { tokens } from "../tokens.js";
import { Tile } from "./Tile.js";

export interface FooterMarkProps {
  /** Display version label — defaults to the current build's marketing version. */
  readonly version?: string;
  readonly style?: CSSProperties;
}

/**
 * Small "S" tile + version line. Centred under resting screens (Home,
 * Game End) as a quiet brand mark. The tile is rendered at 18 px so it
 * stays delicate — not a button, not interactive.
 */
export function FooterMark({ version = "v0.4", style }: FooterMarkProps): JSX.Element {
  const { color, space, size } = tokens;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: space.x2,
        color: color.inkSoft,
        fontSize: size.micro,
        textTransform: "uppercase",
        letterSpacing: ".06em",
        ...style,
      }}
    >
      <Tile letter="S" size={18} variant="brown" showValue={false} />
      <span>Scrabble Babble · {version}</span>
    </div>
  );
}
