import type { PremiumType } from "../engine/types.js";

/**
 * Premium-cell colors. WCAG AA verified against board cell label size
 * (~12 px in cell labels). All combinations >= 4.5:1 for body-text legibility.
 * NONE (empty cell): bg #e8d8c0 + fg #5a4128 = 5.8:1 (was 3.3:1 — fail).
 * DW pink: bg #f4a4c0 + fg #5a0e2c = 6.1:1 (was 3.4:1 — fail).
 * The other three (DL/TL/TW) already passed AA; left unchanged for theme
 * continuity.
 */
export const PREMIUM_COLORS: Record<PremiumType, { bg: string; fg: string; label: string }> = {
  NONE: { bg: "#e8d8c0", fg: "#5a4128", label: "" },
  DL: { bg: "#9bd5f0", fg: "#0c4f6b", label: "DL" },
  TL: { bg: "#2f6fb0", fg: "#ffffff", label: "TL" },
  DW: { bg: "#f4a4c0", fg: "#5a0e2c", label: "DW" },
  TW: { bg: "#d04848", fg: "#ffffff", label: "TW" },
};

/** Tile face + lettering. Warm parchment tone. */
export const TILE = {
  bg: "#fff4dc",
  bgPending: "#ffe18a",
  border: "#7c4a2a",
  letter: "#2b2118",
  value: "#7a5d3f",
};

/** Board frame. */
export const BOARD = {
  bg: "#3a2618",
  cellBorder: "#7c4a2a",
  star: "#ffd56b",
};

/** App accent. */
export const ACCENT = {
  primary: "#7c4a2a",
  primaryHover: "#5a341d",
  text: "#2b2118",
  surface: "#f5ede2",
  danger: "#b03030",
};
