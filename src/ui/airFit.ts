/**
 * Fit-to-viewport math for the iPad Air. Pure — no DOM, unit-tested.
 *
 * The app is designed to look good at 1366x880 (iPad Pro, Safari). On a
 * smaller touch screen in landscape (the iPad Air, 1180 wide) we render
 * that same 1366x880 canvas and scale it down to fit. The Pro (1366) and
 * any laptop never activate — see computeAirFit's gate.
 */
export const DESIGN_W = 1366;
export const DESIGN_H = 880;
/** The Air is 1180 wide; the Pro is 1366. 1280 sits cleanly between. */
export const ACTIVATION_MAX_WIDTH = 1280;

export interface ViewportInfo {
  readonly vw: number;
  readonly vh: number;
  /** True on touch screens (any-pointer: coarse). False on mouse/trackpad laptops. */
  readonly isTouch: boolean;
}

export interface FitResult {
  readonly active: boolean;
  readonly scale: number;
}

export function computeAirFit({ vw, vh, isTouch }: ViewportInfo): FitResult {
  const landscape = vw > vh;
  const active = isTouch && landscape && vw <= ACTIVATION_MAX_WIDTH;
  if (!active) return { active: false, scale: 1 };
  const scale = Math.min(vw / DESIGN_W, vh / DESIGN_H, 1);
  return { active: true, scale };
}
