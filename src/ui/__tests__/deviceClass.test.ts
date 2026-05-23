import { describe, it, expect } from "vitest";
import { classifyDevice, PHONE_MAX_SHORT_SIDE } from "../deviceClass.js";

describe("classifyDevice", () => {
  it("iPhone portrait (390x844, touch) → phone + portrait", () => {
    expect(classifyDevice({ vw: 390, vh: 844, isTouch: true })).toEqual({ isPhone: true, portrait: true });
  });
  it("iPhone landscape (844x390, touch) → phone + NOT portrait", () => {
    expect(classifyDevice({ vw: 844, vh: 390, isTouch: true })).toEqual({ isPhone: true, portrait: false });
  });
  it("iPad mini portrait (744x1133, touch) → NOT phone", () => {
    expect(classifyDevice({ vw: 744, vh: 1133, isTouch: true }).isPhone).toBe(false);
  });
  it("iPad Air landscape (1180x820, touch) → NOT phone", () => {
    expect(classifyDevice({ vw: 1180, vh: 820, isTouch: true }).isPhone).toBe(false);
  });
  it("non-touch narrow window (480x900) → NOT phone (laptops never phone-route)", () => {
    expect(classifyDevice({ vw: 480, vh: 900, isTouch: false }).isPhone).toBe(false);
  });
  it("boundary: short side == PHONE_MAX_SHORT_SIDE is a phone", () => {
    expect(classifyDevice({ vw: PHONE_MAX_SHORT_SIDE, vh: 900, isTouch: true }).isPhone).toBe(true);
  });
  it("square viewport counts as portrait", () => {
    expect(classifyDevice({ vw: 500, vh: 500, isTouch: true }).portrait).toBe(true);
  });
});
