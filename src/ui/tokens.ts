/**
 * Scrabble Babble — design tokens.
 *
 * Single source of truth for colours, type, spacing, radii, shadows, and
 * motion across every screen. Ported from the design handoff at
 * `design_handoff_scrabble_system/tokens.js`; kept as a typed constants
 * module so the TypeScript layer can spot regressions if a screen tries
 * to invent its own value.
 *
 * Smell-test rule: if a colour / radius / spacing value appears in only
 * one screen, either promote it here or drop it. One-off values are a
 * regression vector — every drift starts as a "just this once".
 */

// ─── Colour ────────────────────────────────────────────────────────

/**
 * Anchor + accent palette. The `brown`/`cream` family is the brand; the
 * `success`/`danger`/`warn` accents are used sparingly for status-only.
 */
export const color = {
  // Anchor palette (matches the home-screen hero)
  brown: "#6F4423",
  brownDark: "#56341A",
  brownMed: "#8E5E37",
  brownTint: "#E8D6BB",
  cream: "#F1E5CF",
  creamDark: "#E6D6B7",
  paper: "#FFFFFF",
  ink: "#2A1A0C",
  inkSoft: "#6B5641",
  inkMuted: "#8E7B62",
  stroke: "#C9B48E",
  strokeSoft: "#DDC9A2",

  // System accents — muted on purpose; no neon / vivid colours.
  success: "#5A7A4B", // moss — wins, valid word, active dot
  successBg: "#DEE6CF",
  danger: "#A8443B", // brick — destructive only
  dangerBg: "#EFD1C9",
  warn: "#B98033", // amber — dictionary alerts
  warnBg: "#F1DDB7",
} as const;

/**
 * Board premium-square palette. Muted on purpose so the board lives on
 * the cream world instead of fighting it. Each square type pairs a
 * background with a legible ink colour (WCAG-AA verified against the
 * 12 px label text).
 */
export const square = {
  base: "#EBDBBE", // empty cell — cream a half-step darker
  tw: { bg: "#A04A3F", ink: "#FFFFFF" }, // triple word — terracotta
  dw: { bg: "#D89B82", ink: "#5A1F12" }, // double word — peach
  tl: { bg: "#4E7480", ink: "#FFFFFF" }, // triple letter — muted teal
  dl: { bg: "#B8C9BB", ink: "#1F3A2A" }, // double letter — sage
  star: "#6F4423", // centre star fill — same as brown
  starInk: "#F1E5CF", // centre ★ glyph — cream so it pops on brown
} as const;

/**
 * Tile gradients. The cream and brown tiles have the same 165° angle,
 * different stops. The placed-but-uncommitted variant adds a moss ring
 * (handled in the Tile component, not here).
 */
export const tileGradient = {
  cream:
    "linear-gradient(165deg, #F8EBD0 0%, #EBD7AE 65%, #E2C896 100%)",
  brown:
    "linear-gradient(165deg, #875632 0%, #6F4423 60%, #5A3818 100%)",
} as const;

// ─── Typography ────────────────────────────────────────────────────

export const font = {
  serif: '"Georgia", "Iowan Old Style", "Apple Garamond", serif',
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const;

/**
 * Type scale (px). Built for arm's-length iPad reading; no in-between
 * values. If you need 24 px, you don't — use 22 (h4) or 28 (h3).
 */
export const size = {
  micro: 12,
  caption: 14,
  body: 17,
  bodyLg: 19,
  h4: 22,
  h3: 28,
  h2: 36,
  h1: 48,
  display: 64,
} as const;

export const weight = {
  reg: 500,
  med: 600,
  bold: 700,
  heavy: 800,
} as const;

// ─── Spacing scale ─────────────────────────────────────────────────

/**
 * 4-based spacing scale. Use named keys (`space.x3`) — don't invent
 * intermediate values like 10 or 14. Forces every gap on every screen
 * to come from the same set.
 */
export const space = {
  x05: 2,
  x1: 4,
  x2: 8,
  x3: 12,
  x4: 16,
  x5: 20,
  x6: 24,
  x8: 32,
  x10: 40,
  x12: 48,
  x16: 64,
} as const;

// ─── Radii ─────────────────────────────────────────────────────────

export const radius = {
  tile: 8,
  chip: 10,
  card: 14,
  panel: 18,
  pill: 999,
} as const;

// ─── Shadows ───────────────────────────────────────────────────────

/**
 * Named shadows — never one-off. Each combines highlight inset + bevel
 * inset + warm drop to imply physical depth without a `backdrop-filter`
 * in sight (no glassmorphism anywhere in this system).
 */
export const shadow = {
  tile:
    "0 1px 0 rgba(255,255,255,.55) inset, " +
    "0 -2px 0 rgba(120,80,40,.18) inset, " +
    "0 2px 3px rgba(60,30,0,.14)",
  tileBrown:
    "0 1px 0 rgba(255,210,160,.18) inset, " +
    "0 -2px 0 rgba(0,0,0,.20) inset, " +
    "0 2px 3px rgba(60,30,0,.22)",
  card:
    "0 1px 0 rgba(255,255,255,.7) inset, " +
    "0 1px 2px rgba(60,30,0,.06), " +
    "0 8px 22px -12px rgba(60,30,0,.18)",
  cardHover:
    "0 1px 0 rgba(255,255,255,.7) inset, " +
    "0 4px 10px rgba(60,30,0,.10), " +
    "0 18px 36px -16px rgba(60,30,0,.28)",
  primary:
    "0 1px 0 rgba(255,220,180,.18) inset, " +
    "0 -2px 0 rgba(0,0,0,.18) inset, " +
    "0 12px 26px -14px rgba(60,30,0,.55)",
  modal:
    "0 30px 80px -20px rgba(40,20,0,.35), " +
    "0 8px 24px -8px rgba(40,20,0,.18)",
  toast: "0 12px 30px -10px rgba(40,20,0,.35)",
} as const;

// ─── Motion ────────────────────────────────────────────────────────

/**
 * Motion tokens, capped at 280 ms. The brand has no spring physics, no
 * oscillating bounces — every transition is `ease` or `ease-out`.
 */
export const motion = {
  fast: "120ms ease",
  normal: "200ms ease",
  slow: "280ms ease-out",
} as const;

// ─── Layout ────────────────────────────────────────────────────────

export const layout = {
  iPad: { w: 1180, h: 820 },
  phone: { w: 480, h: 900 },
  tapMin: 44, // any button
  tapTile: 64, // rack tiles (iPad)
  rackTileTablet: 72, // rack tiles on the in-game board (slightly larger)
  rackTileTumbler: 84, // rack tiles in Tumbler (rack-first screen)
} as const;

// ─── Paper grain ───────────────────────────────────────────────────

/**
 * Reusable paper-dot grain. Two stacked radial-gradients give the cream
 * paper a subtle texture without a real image asset. Applied to every
 * resting screen via the {@link Surface} component.
 */
export const grain = {
  image:
    "radial-gradient(rgba(110,70,30,.05) 1px, transparent 1px), " +
    "radial-gradient(rgba(110,70,30,.04) 1px, transparent 1px)",
  size: "7px 7px, 11px 11px",
  position: "0 0, 3px 5px",
  opacity: 0.35,
} as const;

// ─── Aggregate export ──────────────────────────────────────────────

/**
 * Single namespace import for convenience: `import { tokens } from
 * "../tokens.js"` → `tokens.color.brown`. Named exports above remain
 * available for code that only needs one sub-tree.
 */
export const tokens = {
  color,
  square,
  tileGradient,
  font,
  size,
  weight,
  space,
  radius,
  shadow,
  motion,
  layout,
  grain,
} as const;

export type Tokens = typeof tokens;
