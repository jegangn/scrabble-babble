import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import {
  getBeeProgress,
  getTumblerBest,
  localDateKey,
  setBeeProgress,
  setTumblerBest,
} from "../../storage/solo-storage.js";

async function resetDb(): Promise<void> {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("scrabble-babble");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  await resetDb();
});

describe("localDateKey", () => {
  it("formats as YYYY-MM-DD with zero padding", () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(localDateKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("uses local time, not UTC", () => {
    // 2026-05-12 00:00 local time should produce "2026-05-12" regardless of TZ.
    const localMidnight = new Date(2026, 4, 12, 0, 0, 0);
    expect(localDateKey(localMidnight)).toBe("2026-05-12");
  });
});

describe("Tumbler best persistence", () => {
  it("defaults to 0 when no prior best", async () => {
    expect(await getTumblerBest()).toBe(0);
  });

  it("round-trips a score", async () => {
    await setTumblerBest(247);
    expect(await getTumblerBest()).toBe(247);
  });

  it("setTumblerBest overwrites the previous value", async () => {
    await setTumblerBest(100);
    await setTumblerBest(50);
    expect(await getTumblerBest()).toBe(50);
  });
});

describe("Bee progress persistence", () => {
  it("returns null when no entry for that day", async () => {
    expect(await getBeeProgress("2026-05-12")).toBeNull();
  });

  it("round-trips a per-day progress entry", async () => {
    const progress = { dateKey: "2026-05-12", found: ["WORD", "WORDY"] };
    await setBeeProgress(progress);
    const loaded = await getBeeProgress("2026-05-12");
    expect(loaded).toEqual(progress);
  });

  it("keeps separate entries per date", async () => {
    await setBeeProgress({ dateKey: "2026-05-12", found: ["ALPHA"] });
    await setBeeProgress({ dateKey: "2026-05-13", found: ["BETA"] });
    const a = await getBeeProgress("2026-05-12");
    const b = await getBeeProgress("2026-05-13");
    expect(a?.found).toEqual(["ALPHA"]);
    expect(b?.found).toEqual(["BETA"]);
  });

  it("setBeeProgress overwrites the same day's entry", async () => {
    await setBeeProgress({ dateKey: "2026-05-12", found: ["ONE"] });
    await setBeeProgress({ dateKey: "2026-05-12", found: ["ONE", "TWO"] });
    const loaded = await getBeeProgress("2026-05-12");
    expect(loaded?.found).toEqual(["ONE", "TWO"]);
  });
});
