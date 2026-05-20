import type { CSSProperties } from "react";
import { tokens } from "../tokens.js";

export type ScoreChipTone = "ink" | "brown" | "success";

export interface ScoreChipProps {
  /** Number or text to display — always rendered tabular-nums-aligned. */
  readonly value: number | string;
  /** Larger size (h2 / 64 px min-width) — used on the in-game scoreboard. */
  readonly big?: boolean;
  /**
   * Colour tone. `ink` is the neutral default; `brown` is the active-
   * player highlight; `success` is for moss-coloured win banners.
   */
  readonly tone?: ScoreChipTone;
  readonly style?: CSSProperties;
}

/**
 * Small number badge. Always rendered with `tabular-nums` so digit
 * widths align — scoreboards don't shift when a score rolls from 99
 * to 100.
 */
export function ScoreChip({
  value,
  big,
  tone = "ink",
  style,
}: ScoreChipProps): JSX.Element {
  const { color, radius, font, weight, size } = tokens;
  const dims = big
    ? { fontSize: size.h2, padding: "6px 14px", minWidth: 64 }
    : { fontSize: size.bodyLg, padding: "4px 10px", minWidth: 36 };

  const palette =
    tone === "brown"
      ? {
          background: color.brown,
          color: color.cream,
          border: `1px solid ${color.brownDark}`,
        }
      : tone === "success"
        ? {
            background: color.successBg,
            color: color.success,
            border: `1px solid ${color.success}`,
          }
        : {
            background: color.cream,
            color: color.ink,
            border: `1px solid ${color.stroke}`,
          };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: font.serif,
        fontWeight: weight.bold,
        borderRadius: radius.chip,
        fontVariantNumeric: "tabular-nums",
        ...dims,
        ...palette,
        ...style,
      }}
    >
      {value}
    </span>
  );
}
