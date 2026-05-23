/**
 * Phone detection, mirroring airFit.ts's pure/tested style. A phone is a
 * touch device whose SHORTER side is small enough that the 1366-wide canvas
 * can't be scaled to anything usable — it needs a native portrait layout.
 *
 * 540 cleanly separates phones (short side ≤ ~430) from tablets (iPad mini is
 * 744). `isTouch` reuses the (any-pointer: coarse) signal, so a mouse/trackpad
 * laptop never takes the phone path, even in a narrow window.
 */
export const PHONE_MAX_SHORT_SIDE = 540;

export interface DeviceViewport {
  readonly vw: number;
  readonly vh: number;
  readonly isTouch: boolean;
}

export interface DeviceClass {
  readonly isPhone: boolean;
  readonly portrait: boolean;
}

export function classifyDevice({ vw, vh, isTouch }: DeviceViewport): DeviceClass {
  const shortSide = Math.min(vw, vh);
  const isPhone = isTouch && shortSide <= PHONE_MAX_SHORT_SIDE;
  const portrait = vh >= vw;
  return { isPhone, portrait };
}
