import { useMemo, type CSSProperties } from "react";
import { APP_NAME } from "../../config/branding.js";
import { tokens } from "../tokens.js";
import { MenuTile } from "./MenuTile.js";

// ─── Hero "shuffle settle" animation ──────────────────────────────
// Each tile enters scattered (random offset + rotation) and snaps into
// the grid with a brief spring overshoot. The tagline fades up during
// the last tile's settle. One-shot, no loop. Honors prefers-reduced-motion.
//
// Shared by the landscape HomeScreen and the phone PhoneHome so the two
// home titles can never drift apart — both render the animated tile
// wordmark, only the tile size differs.

// Two-row tile breakdown, derived from the app name (never hardcode it).
const HERO_WORDS = APP_NAME.toUpperCase().split(" ");
const HERO_TILE_COUNT = HERO_WORDS.reduce((n, w) => n + w.length, 0);
const HERO_TILE_DURATION_MS = 900;
const HERO_STAGGER_MAX_MS = 130;
const HERO_TAGLINE_DURATION_MS = 400;
const HERO_TAGLINE_OVERLAP_MS = 250; // tagline starts this many ms before the last tile lands
const HERO_TAGLINE_DELAY_MS =
  HERO_STAGGER_MAX_MS + HERO_TILE_DURATION_MS - HERO_TAGLINE_OVERLAP_MS;

/**
 * Deterministic per-tile-index variance. Mulberry32 stepped four times
 * per tile so each tile gets four independent draws (rx-sign, rx-mag,
 * ry-sign, ry-mag) plus one more for rotation. Stable across re-renders
 * so the same tile always lands the same way — only the mount triggers
 * a replay.
 */
function heroVariance(i: number): {
  rx: number;
  ry: number;
  rot: number;
  d: number;
} {
  const draw = (k: number): number => {
    let t = (i * 8 + k + 1) * 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const sign = (x: number): 1 | -1 => (x < 0.5 ? -1 : 1);
  const rx = sign(draw(0)) * (60 + draw(1) * 60); // ±60..±120 px
  const ry = sign(draw(2)) * (30 + draw(3) * 60); // ±30..±90 px
  const rot = (draw(4) - 0.5) * 44; // -22..+22 deg
  // Sequential stagger across all tiles (not random) so the eye reads
  // a clear left-to-right cascade rather than chaos.
  const d = (i / Math.max(1, HERO_TILE_COUNT - 1)) * HERO_STAGGER_MAX_MS;
  return { rx, ry, rot, d };
}

const HERO_KEYFRAMES = `
@keyframes hero-shuffle-settle {
  from {
    opacity: 0;
    transform: translate(var(--rx), var(--ry)) rotate(var(--rot)) scale(0.85);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes hero-tagline-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}
.hero-tile {
  display: inline-block;
  animation: hero-shuffle-settle ${HERO_TILE_DURATION_MS}ms cubic-bezier(.34, 1.4, .5, 1) both;
  animation-delay: var(--d, 0ms);
}
.hero-tagline {
  opacity: 0;
  animation: hero-tagline-up ${HERO_TAGLINE_DURATION_MS}ms ease-out both;
  animation-delay: ${HERO_TAGLINE_DELAY_MS}ms;
}
@media (prefers-reduced-motion: reduce) {
  .hero-tile, .hero-tagline {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
`;

export interface TileHeroProps {
  /** Tile side length in px. Landscape uses 60; the narrow phone uses ~36. */
  readonly tileSize?: number;
  /** Gap between tiles (within a row) and between the two rows. */
  readonly tileGap?: number;
}

/**
 * Animated tile wordmark — the SCRABBLE / BABBLE hero rows plus the
 * "Words, on your terms." tagline. Renders an `<h1>` (with an
 * `aria-label` of {@link APP_NAME} so the heading reads as one name, not
 * a string of letters) followed by the tagline `<p>`. The caller wraps
 * these in its own centred `<header>`.
 */
export function TileHero({ tileSize = 60, tileGap = 6 }: TileHeroProps): JSX.Element {
  // Precompute the rows once per size. heroVariance is deterministic by
  // index, so the visual is stable across renders; useMemo avoids
  // re-mapping the JSX on unrelated re-renders.
  const heroRows = useMemo(() => {
    let globalIndex = 0;
    return HERO_WORDS.map((word, rowIndex) => (
      <div key={rowIndex} style={{ display: "flex", alignItems: "flex-end", gap: tileGap }}>
        {Array.from(word).map((ch) => {
          const i = globalIndex++;
          const { rx, ry, rot, d } = heroVariance(i);
          return (
            <span
              key={i}
              className="hero-tile"
              style={
                {
                  "--rx": `${rx.toFixed(2)}px`,
                  "--ry": `${ry.toFixed(2)}px`,
                  "--rot": `${rot.toFixed(2)}deg`,
                  "--d": `${d.toFixed(0)}ms`,
                } as CSSProperties
              }
            >
              <MenuTile
                letter={ch}
                size={tileSize}
                variant={rowIndex === 0 ? "cream" : "brown"}
              />
            </span>
          );
        })}
      </div>
    ));
  }, [tileSize, tileGap]);

  return (
    <>
      <style>{HERO_KEYFRAMES}</style>
      <h1
        aria-label={APP_NAME}
        style={{
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: tileGap,
        }}
      >
        {heroRows}
      </h1>
      <p
        className="hero-tagline"
        style={{
          margin: 0,
          fontSize: tokens.size.caption,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: tokens.color.inkSoft,
          fontWeight: tokens.weight.reg,
          fontFamily: tokens.font.sans,
        }}
      >
        Words, on your terms.
      </p>
    </>
  );
}
