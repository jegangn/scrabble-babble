/**
 * DEPRECATED — kept as a thin back-compat shim during the design-system
 * migration. New code should import from `./tokens.js` directly.
 *
 * The shape and colour values here are now derived from `tokens.ts`. As
 * each screen is rebuilt to use the token namespace, its import of this
 * file gets removed. Once no consumers remain, this file is deleted.
 */

import type { PremiumType } from "../engine/types.js";
import { color, square } from "./tokens.js";

/**
 * Premium-cell palette. Backed by the muted tokens
 * (terracotta/peach/teal/sage), not the old vivid Scrabble colours.
 */
export const PREMIUM_COLORS: Record<PremiumType, { bg: string; fg: string; label: string }> = {
  NONE: { bg: square.base, fg: color.inkSoft, label: "" },
  DL: { bg: square.dl.bg, fg: square.dl.ink, label: "DL" },
  TL: { bg: square.tl.bg, fg: square.tl.ink, label: "TL" },
  DW: { bg: square.dw.bg, fg: square.dw.ink, label: "DW" },
  TW: { bg: square.tw.bg, fg: square.tw.ink, label: "TW" },
};

/** Tile face + lettering — legacy keys, now from tokens. */
export const TILE = {
  bg: "#fff4dc",
  bgPending: color.success, // moss ring for placed-but-uncommitted
  border: color.brown,
  letter: color.ink,
  value: color.inkSoft,
};

/** Board frame. */
export const BOARD = {
  bg: color.brown,
  cellBorder: color.brownMed,
  star: color.cream,
};

/** App accent. */
export const ACCENT = {
  primary: color.brown,
  primaryHover: color.brownDark,
  text: color.ink,
  surface: color.cream,
  danger: color.danger,
};
