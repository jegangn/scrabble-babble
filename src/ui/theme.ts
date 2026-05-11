import type { PremiumType } from "../engine/types.js";

/**
 * Premium-cell colors. Older-user contrast checked: hues are distinct
 * (not similar shades). Saturation tuned for landscape lighting.
 */
export const PREMIUM_COLORS: Record<PremiumType, { bg: string; fg: string; label: string }> = {
  NONE: { bg: "#e8d8c0", fg: "#7a5d3f", label: "" },
  DL: { bg: "#9bd5f0", fg: "#0c4f6b", label: "DL" },
  TL: { bg: "#2f6fb0", fg: "#ffffff", label: "TL" },
  DW: { bg: "#f4a4c0", fg: "#7a1d3f", label: "DW" },
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
