import type { CSSProperties } from "react";
import type { PlacedTile, Tile as TileT } from "../../engine/types.js";
import { tokens } from "../tokens.js";

/**
 * Visual style of the tile face.
 *
 * - `cream`  — default Scrabble tile. The 165° three-stop gradient gives
 *              the characteristic bevelled look.
 * - `brown`  — inverted variant used in the home-screen hero and a few
 *              accent spots.
 * - `ghost`  — outlined transparent variant used in Swap-picker to show
 *              the deselected state without losing the tile silhouette.
 * - `blank`  — softer cream gradient for the visible "blank" tile face
 *              before the user has picked a letter.
 */
export type TileVariant = "cream" | "brown" | "ghost" | "blank";

export interface TileProps {
  /**
   * Engine tile (letter or blank). Preferred form — the display letter and
   * point value are derived from it. Either this or `letter` must be set.
   */
  readonly tile?: PlacedTile | TileT;
  /** Raw letter override. Used when there's no engine tile, e.g. on the menu hero. */
  readonly letter?: string;
  /**
   * Explicit point value for the score digit. Used by callers (MenuTile)
   * that supply a raw letter and have their own letter→value lookup.
   * Ignored when an engine `tile` is provided — that derives its own value.
   */
  readonly value?: number | undefined;
  /** Tile face style. Defaults to `cream`. */
  readonly variant?: TileVariant;
  /** Edge length in px. Defaults to 64 (the iPad rack-tile minimum). */
  readonly size?: number;
  /** Show the point-value subscript. Defaults to true (off for menu hero). */
  readonly showValue?: boolean;
  /**
   * Render the moss-ring "placed-but-uncommitted" treatment. Used for
   * tiles on the board that haven't been submitted yet.
   */
  readonly placed?: boolean;
  /**
   * Back-compat alias for `placed`. The old prop was `pending`; new code
   * should use `placed` to match the handoff naming. Either prop works.
   */
  readonly pending?: boolean;
  readonly style?: CSSProperties;
}

// ─── Spec fonts ────────────────────────────────────────────────────
//
// Imported via the Google Fonts <link> in index.html (Domine 700 +
// Atkinson Hyperlegible 700). Keep the system fallbacks so the tile
// still reads as the spec intends if the font hasn't loaded yet.
export const FONT_LETTER =
  '"Domine", "Iowan Old Style", "Apple Garamond", Georgia, serif';
export const FONT_VALUE =
  '"Atkinson Hyperlegible", ui-sans-serif, -apple-system, system-ui, sans-serif';

// ─── Spec backgrounds ──────────────────────────────────────────────
//
// Three layers stacked top-to-bottom (the spec's exact strings):
//   1) faint 92° repeating linear — wood-grain noise
//   2) radial highlight at 28% / 18%
//   3) 165° three-stop linear — the body gradient
//
// At s-32 the grain layer is dropped (looks busy at thumbnail scale).
// At s-24 the radial is dropped too — pure linear gradient.
export const BG_CREAM_FULL =
  "repeating-linear-gradient(92deg, rgba(120,80,40,.022) 0px, rgba(120,80,40,.022) 1px, transparent 1px, transparent 3px), " +
  "radial-gradient(ellipse at 28% 18%, rgba(255,250,235,.55), transparent 60%), " +
  "linear-gradient(165deg, #F8EBD0 0%, #EBD7AE 60%, #DCBE91 100%)";

export const BG_CREAM_LIGHT =
  "radial-gradient(ellipse at 28% 18%, rgba(255,250,235,.35), transparent 60%), " +
  "linear-gradient(165deg, #F8EBD0 0%, #EBD7AE 60%, #E2C896 100%)";

export const BG_CREAM_TINY =
  "linear-gradient(165deg, #F4E5C5 0%, #E2C896 100%)";

export const BG_BROWN_FULL =
  "repeating-linear-gradient(92deg, rgba(0,0,0,.04) 0px, rgba(0,0,0,.04) 1px, transparent 1px, transparent 3px), " +
  "radial-gradient(ellipse at 28% 18%, rgba(255,210,160,.20), transparent 60%), " +
  "linear-gradient(165deg, #8A5934 0%, #6F4423 60%, #4E2E13 100%)";

export const BG_BROWN_LIGHT =
  "linear-gradient(165deg, #7E5230 0%, #6F4423 60%, #5A3818 100%)";

export const BG_BROWN_TINY =
  "linear-gradient(165deg, #7A4F2C 0%, #5A3818 100%)";

// ─── Spec shadows ──────────────────────────────────────────────────
//
// Eight-layer 3D stack for the large sizes; halved for s-32; minimal
// for s-24. The "placed-but-uncommitted" ring sits ON TOP of the
// regular shadow so the ring stays visible at any size.
export const SHADOW_CREAM_FULL =
  "inset 0 2px 1px rgba(255,255,255,.75), " +
  "inset 2px 0 1.5px rgba(255,250,235,.4), " +
  "inset 0 -4px 3px rgba(120,80,40,.45), " +
  "inset -2px 0 2px rgba(120,80,40,.20), " +
  "0 1px 0 rgba(255,250,235,.4), " +
  "0 3px 0 rgba(108,68,38,.55), " +
  "0 6px 10px -2px rgba(60,30,0,.35), " +
  "0 14px 22px -8px rgba(60,30,0,.30)";

export const SHADOW_CREAM_LIGHT =
  "inset 0 1px 0 rgba(255,255,255,.55), " +
  "inset 0 -1px 0 rgba(120,80,40,.25), " +
  "0 1px 2px rgba(60,30,0,.18)";

export const SHADOW_CREAM_TINY =
  "inset 0 1px 0 rgba(255,255,255,.45), " +
  "inset 0 -1px 0 rgba(120,80,40,.20), " +
  "0 1px 1px rgba(60,30,0,.15)";

export const SHADOW_BROWN_FULL =
  "inset 0 2px 1px rgba(255,210,160,.32), " +
  "inset 2px 0 1.5px rgba(255,210,160,.10), " +
  "inset 0 -4px 3px rgba(0,0,0,.45), " +
  "inset -2px 0 2px rgba(0,0,0,.18), " +
  "0 1px 0 rgba(255,220,180,.18), " +
  "0 3px 0 rgba(30,14,0,.55), " +
  "0 6px 10px -2px rgba(0,0,0,.40), " +
  "0 14px 22px -8px rgba(0,0,0,.32)";

export const SHADOW_BROWN_LIGHT =
  "inset 0 1px 0 rgba(255,210,160,.25), " +
  "inset 0 -1px 0 rgba(0,0,0,.30), " +
  "0 1px 2px rgba(0,0,0,.22)";

export const SHADOW_BROWN_TINY =
  "inset 0 1px 0 rgba(255,210,160,.20), " +
  "inset 0 -1px 0 rgba(0,0,0,.25), " +
  "0 1px 1px rgba(0,0,0,.18)";

/** Engine-tile → display tuple. */
function deriveFromTile(t: PlacedTile | TileT): { letter: string; value: number | null } {
  if (t.kind === "letter") return { letter: t.letter, value: t.value };
  // Blank tile — `letter` is set once the user picks one on the board.
  if ("letter" in t && typeof t.letter === "string") {
    return { letter: t.letter, value: null }; // blanks score 0; hide digit
  }
  return { letter: "", value: null };
}

/**
 * Spec tier — which of the five fixed treatments to apply. The spec
 * defines visuals at exactly 96 / 72 / 52 / 32 / 24 px; callers pass
 * arbitrary widths, so we snap to the nearest tier for the background
 * and shadow treatment while keeping the requested size as the actual
 * px width/height.
 */
type Tier = "s96" | "s72" | "s52" | "s32" | "s24";

function tierFor(size: number): Tier {
  if (size >= 84) return "s96";
  if (size >= 62) return "s72";
  if (size >= 42) return "s52";
  if (size >= 28) return "s32";
  return "s24";
}

/**
 * Scrabble tile — the workhorse component used on the board, in racks,
 * in pickers, and in the menu hero. Final-spec rebuild (Option B ·
 * Domine letter + Atkinson Hyperlegible digit, 3D dimensional treatment
 * for the rack/board sizes and a lighter treatment for thumbnails).
 *
 * Letter centring is pure CSS grid (`display: grid; place-items: center`)
 * with the letter as a plain (non-positioned, non-transformed) child.
 * The score digit lives in a fixed corner zone (right 9 % / bottom 7 %)
 * the letter cannot reach — capped at 0.55 × width so even W and M
 * clear the corner.
 */
export function Tile({
  tile,
  letter,
  value,
  variant = "cream",
  size = 64,
  showValue = true,
  placed = false,
  pending = false,
  style,
}: TileProps): JSX.Element {
  // Either `placed` or `pending` triggers the moss ring — kept for
  // back-compat with the older API used by BoardCell / GameScreen.
  const isPlaced = placed || pending;

  // Resolve letter + value from whichever input the caller used.
  // Priority: engine tile > explicit `value` prop > none.
  let displayLetter = letter ?? "";
  let displayValue: number | null = value ?? null;
  if (tile) {
    const d = deriveFromTile(tile);
    displayLetter = d.letter;
    displayValue = d.value;
  }

  // Spec ratios — letter 0.55 × width, digit 0.17 × width, radius 0.14 × width.
  // The letter is `min`-capped so widest glyphs (W, M) never reach the
  // digit corner; matches the spec's explicit font-size table.
  const letterPx = Math.max(10, Math.round(size * 0.55));
  const valuePx = Math.max(7, Math.round(size * 0.17));
  const radiusPx = Math.max(4, Math.round(size * 0.14));

  const tier = tierFor(size);
  const isBrown = variant === "brown";

  // Pick background + shadow for the variant × tier matrix. Ghost and
  // blank stay outside the spec tiers — they have their own role
  // (deselected state in pickers, blank-tile face) and the spec doesn't
  // cover them.
  let background: string;
  let boxShadow: string;
  if (variant === "ghost") {
    background = "transparent";
    boxShadow = `inset 0 0 0 1.5px ${tokens.color.brown}`;
  } else if (variant === "blank") {
    background = "linear-gradient(165deg, #FAF1DC 0%, #EFE0BE 100%)";
    boxShadow = SHADOW_CREAM_LIGHT;
  } else if (isBrown) {
    background =
      tier === "s24" ? BG_BROWN_TINY : tier === "s32" ? BG_BROWN_LIGHT : BG_BROWN_FULL;
    boxShadow =
      tier === "s24" ? SHADOW_BROWN_TINY : tier === "s32" ? SHADOW_BROWN_LIGHT : SHADOW_BROWN_FULL;
  } else {
    background =
      tier === "s24" ? BG_CREAM_TINY : tier === "s32" ? BG_CREAM_LIGHT : BG_CREAM_FULL;
    boxShadow =
      tier === "s24" ? SHADOW_CREAM_TINY : tier === "s32" ? SHADOW_CREAM_LIGHT : SHADOW_CREAM_FULL;
  }

  // Placed-but-uncommitted — moss inset ring layered ON TOP of the
  // existing shadow so the ring reads at every tier. The spec's exact
  // ring rule: `inset 0 0 0 2px var(--success)`.
  if (isPlaced) {
    boxShadow = `inset 0 0 0 2px ${tokens.color.success}, ${boxShadow}`;
  }

  const ink = isBrown
    ? tokens.color.cream
    : variant === "ghost"
      ? tokens.color.brown
      : tokens.color.ink;

  // Letter engraving — dual text-shadow at full/light tiers, stripped
  // at s-32 / s-24 (at 14-18 px it just blurs the glyph).
  const letterTextShadow =
    tier === "s24" || tier === "s32"
      ? "none"
      : isBrown
        ? "0 1px 0 rgba(255,220,180,.20), 0 -1px 0 rgba(0,0,0,.45)"
        : "0 1px 0 rgba(255,250,235,.55), 0 -1px 0 rgba(0,0,0,.08)";

  const letterStroke =
    tier === "s24" || tier === "s32"
      ? "0.4px"
      : isBrown
        ? "0.5px"
        : "0.6px";

  // Score digit ink — brand brown on cream, cream on brown.
  const valueColor = isBrown ? tokens.color.cream : tokens.color.brown;
  const valueShadow =
    tier === "s24" || tier === "s32"
      ? "none"
      : isBrown
        ? "0 1px 0 rgba(0,0,0,.35)"
        : "0 1px 0 rgba(255,250,235,.5)";

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: radiusPx,
        background,
        color: ink,
        boxShadow,
        display: "grid",
        placeItems: "center",
        userSelect: "none",
        flexShrink: 0,
        ...style,
      }}
    >
      <span
        className="l"
        style={{
          fontFamily: FONT_LETTER,
          fontWeight: 700,
          fontSize: letterPx,
          letterSpacing: "-0.01em",
          lineHeight: 1,
          fontFeatureSettings: '"lnum", "kern"',
          WebkitFontSmoothing: "antialiased",
          WebkitTextStroke: `${letterStroke} currentColor`,
          paintOrder: "stroke fill",
          textShadow: letterTextShadow,
          pointerEvents: "none",
        }}
      >
        {displayLetter}
      </span>
      {/* Score digit — hidden at s-24 per spec (display: none). At every
          other size it sits at right 9% / bottom 7%. */}
      {showValue && displayValue !== null && tier !== "s24" && (
        <span
          className="v"
          style={{
            position: "absolute",
            right: "9%",
            bottom: "7%",
            fontFamily: FONT_VALUE,
            fontWeight: 700,
            fontSize: valuePx,
            lineHeight: 1,
            color: valueColor,
            fontVariantNumeric: "tabular-nums",
            textShadow: valueShadow,
            pointerEvents: "none",
          }}
        >
          {displayValue}
        </span>
      )}
    </div>
  );
}
