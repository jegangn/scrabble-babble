import { describe, expect, it } from "vitest";
import { computeAirFit, DESIGN_W, DESIGN_H, ACTIVATION_MAX_WIDTH } from "../fitToViewport.js";

describe("computeAirFit", () => {
  it("stays inactive on the iPad Pro (PWA 1366x1024)", () => {
    expect(computeAirFit({ vw: 1366, vh: 1024, isTouch: true })).toEqual({ active: false, scale: 1 });
  });

  it("stays inactive on the iPad Pro (Safari 1366x880)", () => {
    expect(computeAirFit({ vw: 1366, vh: 880, isTouch: true })).toEqual({ active: false, scale: 1 });
  });

  it("stays inactive on a mouse/trackpad laptop", () => {
    expect(computeAirFit({ vw: 1440, vh: 900, isTouch: false })).toEqual({ active: false, scale: 1 });
  });

  it("stays inactive on a touchscreen laptop (wider than the gate)", () => {
    expect(computeAirFit({ vw: 1536, vh: 864, isTouch: true })).toEqual({ active: false, scale: 1 });
  });

  it("activates and is height-bound on the Air in Safari (1180x704)", () => {
    const r = computeAirFit({ vw: 1180, vh: 704, isTouch: true });
    expect(r.active).toBe(true);
    expect(r.scale).toBeCloseTo(0.8, 5); // min(1180/1366, 704/880) = 704/880 = 0.8
  });

  it("activates and is width-bound on the Air in PWA (1180x820)", () => {
    const r = computeAirFit({ vw: 1180, vh: 820, isTouch: true });
    expect(r.active).toBe(true);
    expect(r.scale).toBeCloseTo(1180 / 1366, 5); // 0.8638 < 820/880
  });

  it("stays inactive in portrait (no scaling when held tall)", () => {
    expect(computeAirFit({ vw: 820, vh: 1180, isTouch: true })).toEqual({ active: false, scale: 1 });
  });

  it("stays inactive on a small non-touch window", () => {
    expect(computeAirFit({ vw: 1000, vh: 700, isTouch: false })).toEqual({ active: false, scale: 1 });
  });

  it("exports the expected design constants", () => {
    expect([DESIGN_W, DESIGN_H, ACTIVATION_MAX_WIDTH]).toEqual([1366, 880, 1280]);
  });
});
