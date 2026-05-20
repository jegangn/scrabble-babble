import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { tokens } from "../tokens.js";
import { BeePill } from "./BeePill.js";

/**
 * Position on the hex. `"center"` is the mandatory centre letter;
 * indices 0..5 are the outer ring (clockwise from 12 o'clock).
 */
export type HexPosition = "center" | 0 | 1 | 2 | 3 | 4 | 5;

export interface BeeHexProps {
  readonly center: string;
  readonly outer: ReadonlyArray<string>; // length 6
  /** Positions currently highlighted (last tapped / touched during slide). */
  readonly highlight?: ReadonlyArray<HexPosition>;
  /** Tap handler — fired when a letter pill is tapped. */
  readonly onLetterTap?: (letter: string, position: HexPosition) => void;
  /** Pointer-down on the container — starts slide-composition. */
  readonly onSlideStart?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  /** Pointer-move on the container during slide-composition. */
  readonly onSlideMove?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  /** Pointer-up / cancel — ends slide-composition. */
  readonly onSlideEnd?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  /**
   * Optional SVG content rendered as an overlay above the pills, beneath
   * pointer events. Used for the slide-trail polyline + halo nodes.
   */
  readonly overlay?: ReactNode;
  /** Edge length of the hex container in px. Defaults to 360. */
  readonly box?: number;
  /** Outer-ring radius from centre in px. Defaults to 100. */
  readonly ringRadius?: number;
  /** Pill diameter in px. Defaults to 110. */
  readonly pillSize?: number;
}

/**
 * Seven-letter hex arrangement — 1 centre + 6 outer pills around a
 * dashed ring guide. The container sits at 360 × 360 px (per the
 * handoff) so action buttons below don't crowd the outer pills.
 *
 * The 6 outer positions follow a pointy-top hex at radii (0.87·r, ±0.5·r),
 * giving the classic NYT-Bee shape. The dashed circle that hints at the
 * ring is purely decorative and never intercepts pointer events.
 *
 * Slide-composition is wired through the optional pointer handlers; the
 * Spelling Bee screen passes a polyline `overlay` showing the path the
 * finger has traced through the pills.
 */
export function BeeHex({
  center,
  outer,
  highlight = [],
  onLetterTap,
  onSlideStart,
  onSlideMove,
  onSlideEnd,
  overlay,
  box = 360,
  ringRadius: r = 100,
  pillSize: size = 110,
}: BeeHexProps): JSX.Element {
  // Pointy-top hex: 0=top, then clockwise. Same offsets as the handoff.
  const positions: ReadonlyArray<{ x: number; y: number }> = [
    { x: 0, y: -r }, // 12 o'clock
    { x: r * 0.87, y: -r * 0.5 }, // 2 o'clock
    { x: r * 0.87, y: r * 0.5 }, // 4 o'clock
    { x: 0, y: r }, // 6 o'clock
    { x: -r * 0.87, y: r * 0.5 }, // 8 o'clock
    { x: -r * 0.87, y: -r * 0.5 }, // 10 o'clock
  ];

  return (
    <div
      style={{
        position: "relative",
        width: box,
        height: box,
        margin: "0 auto",
        touchAction: "none",
      }}
      onPointerDown={onSlideStart}
      onPointerMove={onSlideMove}
      onPointerUp={onSlideEnd}
      onPointerCancel={onSlideEnd}
    >
      {/* Decorative dashed ring guide — purely visual, no events. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: r * 2 + size,
          height: r * 2 + size,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          border: `1px dashed ${tokens.color.strokeSoft}`,
          pointerEvents: "none",
        }}
      />

      {/* Trail-polyline overlay (caller-provided) sits above the ring,
          below the pills. Pointer-events none so the caller's onLetterTap
          still fires when the user releases over a pill. */}
      {overlay && (
        <svg
          width={box}
          height={box}
          viewBox={`-${box / 2} -${box / 2} ${box} ${box}`}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          {overlay}
        </svg>
      )}

      {/* Centre pill */}
      <div
        data-bee-position="center"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <BeePill
          letter={center}
          center
          size={size}
          highlighted={highlight.includes("center")}
          onTap={onLetterTap ? () => onLetterTap(center, "center") : undefined}
        />
      </div>

      {/* Outer ring */}
      {positions.map((p, i) => {
        const letter = outer[i] ?? "";
        return (
          <div
            key={i}
            data-bee-position={i}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px))`,
            }}
          >
            <BeePill
              letter={letter}
              size={size}
              highlighted={highlight.includes(i as HexPosition)}
              onTap={onLetterTap ? () => onLetterTap(letter, i as HexPosition) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
