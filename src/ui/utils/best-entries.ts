import type { BeeTopEntry, LeaderboardEntry } from "../../storage/solo-storage.js";

/** The normalized entry shape `BestScoresCard` consumes. Both Tumbler and
 *  Bee storage rows are adapted to this so the card has one rendering
 *  path. `dateLabel` is pre-formatted dd/MM/yyyy. */
export interface BestScoresEntry {
  readonly name: string;
  readonly score: number;
  readonly dateLabel: string;
}

/** Format an epoch timestamp as dd/MM/yyyy (local time), per project
 *  defaults. Replaces the inline formatDate() previously duplicated in
 *  TumblerScreen, TumblerEndScreen, and PhoneTumblerEnd. */
export function formatTumblerDate(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Convert a Spelling Bee dateKey (YYYY-MM-DD, produced by
 *  `localDateKey()`) to dd/MM/yyyy. Pure string reorder — no Date()
 *  involved, so no timezone surprises. */
export function formatBeeDate(dateKey: string): string {
  // dateKey is contractually "YYYY-MM-DD" (produced by localDateKey()). If a
  // caller hands us anything else, pass it through unchanged rather than
  // silently rendering "///" or "//foo" — easier to spot upstream bugs.
  const parts = dateKey.split("-");
  if (parts.length !== 3) return dateKey;
  const [y, m, d] = parts as [string, string, string];
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

export function adaptTumblerEntries(
  entries: ReadonlyArray<LeaderboardEntry>,
): BestScoresEntry[] {
  return entries.map((e) => ({
    name: e.name,
    score: e.score,
    dateLabel: formatTumblerDate(e.timestamp),
  }));
}

export function adaptBeeEntries(
  entries: ReadonlyArray<BeeTopEntry>,
): BestScoresEntry[] {
  return entries.map((e) => ({
    name: e.name,
    score: e.score,
    dateLabel: formatBeeDate(e.dateKey),
  }));
}
