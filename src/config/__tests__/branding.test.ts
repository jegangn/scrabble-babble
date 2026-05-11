import { describe, expect, it } from "vitest";
import { APP_NAME } from "../branding.js";

describe("APP_NAME", () => {
  it("equals 'Scrabble Babble'", () => {
    expect(APP_NAME).toBe("Scrabble Babble");
  });

  it("is a string literal type (non-empty)", () => {
    expect(APP_NAME.length).toBeGreaterThan(0);
  });
});
