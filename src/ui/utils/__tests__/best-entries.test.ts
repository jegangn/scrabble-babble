import { describe, expect, it } from "vitest";
import type { BeeTopEntry, LeaderboardEntry } from "../../../storage/solo-storage.js";
import {
  adaptBeeEntries,
  adaptTumblerEntries,
  formatBeeDate,
  formatTumblerDate,
} from "../best-entries.js";

describe("formatTumblerDate", () => {
  it("formats epoch ms to dd/MM/yyyy in local time", () => {
    // 2026-01-05 14:30 local → "05/01/2026"
    const ts = new Date(2026, 0, 5, 14, 30).getTime();
    expect(formatTumblerDate(ts)).toBe("05/01/2026");
  });

  it("zero-pads single-digit day and month", () => {
    const ts = new Date(2026, 8, 9, 0, 0).getTime(); // 2026-09-09
    expect(formatTumblerDate(ts)).toBe("09/09/2026");
  });

  it("handles end-of-year correctly", () => {
    const ts = new Date(2026, 11, 31, 23, 59).getTime();
    expect(formatTumblerDate(ts)).toBe("31/12/2026");
  });
});

describe("formatBeeDate", () => {
  it("converts YYYY-MM-DD to dd/MM/yyyy", () => {
    expect(formatBeeDate("2026-05-26")).toBe("26/05/2026");
  });

  it("preserves zero-padding from the source key", () => {
    expect(formatBeeDate("2026-01-05")).toBe("05/01/2026");
  });

  it("does not interpret the date — pure string reorder", () => {
    expect(formatBeeDate("2099-12-31")).toBe("31/12/2099");
  });

  it("passes malformed input through unchanged (not silently mangled)", () => {
    expect(formatBeeDate("bad")).toBe("bad");
    expect(formatBeeDate("")).toBe("");
    expect(formatBeeDate("2026")).toBe("2026");
  });
});

describe("adaptTumblerEntries", () => {
  it("returns empty array for empty input", () => {
    expect(adaptTumblerEntries([])).toEqual([]);
  });

  it("preserves order and shapes entries with dd/MM/yyyy dateLabel", () => {
    const entries: ReadonlyArray<LeaderboardEntry> = [
      { name: "Jegan", score: 247, timestamp: new Date(2026, 4, 26).getTime() },
      { name: "Father", score: 198, timestamp: new Date(2026, 4, 25).getTime() },
    ];
    expect(adaptTumblerEntries(entries)).toEqual([
      { name: "Jegan", score: 247, dateLabel: "26/05/2026" },
      { name: "Father", score: 198, dateLabel: "25/05/2026" },
    ]);
  });
});

describe("adaptBeeEntries", () => {
  it("returns empty array for empty input", () => {
    expect(adaptBeeEntries([])).toEqual([]);
  });

  it("preserves order and shapes entries with dd/MM/yyyy dateLabel from dateKey", () => {
    const entries: ReadonlyArray<BeeTopEntry> = [
      { name: "Jegan", score: 84, timestamp: 1, dateKey: "2026-05-26" },
      { name: "Father", score: 62, timestamp: 2, dateKey: "2026-05-25" },
    ];
    expect(adaptBeeEntries(entries)).toEqual([
      { name: "Jegan", score: 84, dateLabel: "26/05/2026" },
      { name: "Father", score: 62, dateLabel: "25/05/2026" },
    ]);
  });
});
