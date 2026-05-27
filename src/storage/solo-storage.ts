/**
 * Persistence helpers for the solo minigames (Tumbler + Spelling Bee).
 *
 * All data lives in the existing `settings` IndexedDB store, keyed
 * additively — no schema bump.
 *
 *  - `tumbler_best` → number (personal best score)
 *  - `bee_progress_YYYY-MM-DD` → { dateKey, found: string[] }
 */

import { open } from "./db.js";

const TUMBLER_BEST_KEY = "tumbler_best";
const BEE_PROGRESS_PREFIX = "bee_progress_";
const TUMBLER_LEADERBOARD_KEY = "leaderboard_tumbler";
const BEE_LEADERBOARD_PREFIX = "leaderboard_bee_";
const MAX_LEADERBOARD_ENTRIES = 10;

/** One entry on a leaderboard. */
export interface LeaderboardEntry {
  readonly name: string;
  readonly score: number;
  readonly timestamp: number;
}

function isLeaderboardEntry(x: unknown): x is LeaderboardEntry {
  if (typeof x !== "object" || x === null) return false;
  const o = x as { name?: unknown; score?: unknown; timestamp?: unknown };
  return (
    typeof o.name === "string" &&
    typeof o.score === "number" &&
    typeof o.timestamp === "number"
  );
}

function sanitizeBoard(raw: unknown): LeaderboardEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isLeaderboardEntry);
}

/**
 * Local-time date key in `YYYY-MM-DD` format. The Bee uses this as both
 * the per-day persistence key and the PRNG seed source.
 */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Retrieve the Tumbler personal-best score, or 0 if none yet. */
export async function getTumblerBest(): Promise<number> {
  const db = await open();
  const entry = await db.get("settings", TUMBLER_BEST_KEY);
  db.close();
  const value = entry?.value;
  return typeof value === "number" && value >= 0 ? value : 0;
}

/** Overwrite the Tumbler personal-best score. */
export async function setTumblerBest(score: number): Promise<void> {
  const db = await open();
  await db.put("settings", { key: TUMBLER_BEST_KEY, value: score });
  db.close();
}

/** A day's Spelling Bee progress: the date and the list of words found so far. */
export interface BeeProgress {
  readonly dateKey: string;
  readonly found: ReadonlyArray<string>;
}

function isBeeProgress(x: unknown): x is BeeProgress {
  if (typeof x !== "object" || x === null) return false;
  const o = x as { dateKey?: unknown; found?: unknown };
  if (typeof o.dateKey !== "string") return false;
  if (!Array.isArray(o.found)) return false;
  return o.found.every((w) => typeof w === "string");
}

/**
 * Retrieve saved progress for a Bee day, or `null` if nothing's been
 * found yet for that date.
 */
export async function getBeeProgress(dateKey: string): Promise<BeeProgress | null> {
  const db = await open();
  const entry = await db.get("settings", BEE_PROGRESS_PREFIX + dateKey);
  db.close();
  const value = entry?.value;
  return isBeeProgress(value) ? value : null;
}

/**
 * Overwrite the entry for one Bee day. Caller is responsible for passing
 * the full found-words list, not just new additions.
 */
export async function setBeeProgress(progress: BeeProgress): Promise<void> {
  const db = await open();
  await db.put("settings", {
    key: BEE_PROGRESS_PREFIX + progress.dateKey,
    value: progress,
  });
  db.close();
}

/**
 * Tumbler leaderboard (all-time, all-users on this device). Top 10 scores
 * kept; older / lower entries are evicted on insert.
 */
export async function getTumblerLeaderboard(): Promise<ReadonlyArray<LeaderboardEntry>> {
  const db = await open();
  const entry = await db.get("settings", TUMBLER_LEADERBOARD_KEY);
  db.close();
  return sanitizeBoard(entry?.value);
}

export async function recordTumblerScore(name: string, score: number): Promise<void> {
  const board = sanitizeBoard((await (async () => {
    const db = await open();
    const entry = await db.get("settings", TUMBLER_LEADERBOARD_KEY);
    db.close();
    return entry?.value;
  })()));
  // Insert + sort + cap. We allow multiple entries per player so the user
  // can see their improvement over time, but cap the whole board at 10.
  const next: LeaderboardEntry[] = [
    ...board,
    { name: name.trim().slice(0, 24) || "Player", score, timestamp: Date.now() },
  ]
    .sort((a, b) => b.score - a.score || a.timestamp - b.timestamp)
    .slice(0, MAX_LEADERBOARD_ENTRIES);
  const db = await open();
  await db.put("settings", { key: TUMBLER_LEADERBOARD_KEY, value: next });
  db.close();
}

/**
 * Spelling Bee leaderboard for a single day. Each user gets ONE slot per
 * day (subsequent recordings for the same name update the entry if the
 * new score is higher). Top 10 shown.
 */
export async function getBeeLeaderboard(
  dateKey: string,
): Promise<ReadonlyArray<LeaderboardEntry>> {
  const db = await open();
  const entry = await db.get("settings", BEE_LEADERBOARD_PREFIX + dateKey);
  db.close();
  return sanitizeBoard(entry?.value);
}

/** Bee top-scores entry — same shape as a leaderboard entry plus the
 *  date the score was achieved on, so the UI can show "May 18" next
 *  to a historical high.
 */
export interface BeeTopEntry extends LeaderboardEntry {
  readonly dateKey: string;
}

/** Iterate every per-day Bee leaderboard once and flatten the entries
 *  into a single list. Used by `getBeeTopScores`; doing the IDB scan
 *  once per call is fine — the settings store stays under a few hundred
 *  rows in normal use.
 */
async function readAllBeeEntries(): Promise<ReadonlyArray<BeeTopEntry>> {
  const db = await open();
  const all = await db.getAll("settings");
  db.close();
  const out: BeeTopEntry[] = [];
  for (const row of all) {
    if (typeof row.key !== "string") continue;
    if (!row.key.startsWith(BEE_LEADERBOARD_PREFIX)) continue;
    const dateKey = row.key.slice(BEE_LEADERBOARD_PREFIX.length);
    for (const entry of sanitizeBoard(row.value)) {
      out.push({ ...entry, dateKey });
    }
  }
  return out;
}

/** All-time top Spelling Bee scores across every day played on this
 *  device. Sorted by score desc, then timestamp asc. Default limit 10.
 */
export async function getBeeTopScores(limit = 10): Promise<ReadonlyArray<BeeTopEntry>> {
  const all = await readAllBeeEntries();
  return [...all]
    .sort((a, b) => b.score - a.score || a.timestamp - b.timestamp)
    .slice(0, limit);
}

export async function recordBeeScore(
  dateKey: string,
  name: string,
  score: number,
): Promise<void> {
  const board = sanitizeBoard(await (async () => {
    const db = await open();
    const entry = await db.get("settings", BEE_LEADERBOARD_PREFIX + dateKey);
    db.close();
    return entry?.value;
  })());
  const cleanName = name.trim().slice(0, 24) || "Player";
  // One entry per player per day. If they already have an entry, keep the
  // HIGHER of the two scores (latest finds always add, never subtract).
  const existing = board.findIndex((e) => e.name === cleanName);
  const next: LeaderboardEntry[] = [...board];
  if (existing >= 0) {
    const prev = next[existing]!;
    next[existing] = {
      name: cleanName,
      score: Math.max(prev.score, score),
      timestamp: Date.now(),
    };
  } else {
    next.push({ name: cleanName, score, timestamp: Date.now() });
  }
  next.sort((a, b) => b.score - a.score || a.timestamp - b.timestamp);
  const capped = next.slice(0, MAX_LEADERBOARD_ENTRIES);
  const db = await open();
  await db.put("settings", { key: BEE_LEADERBOARD_PREFIX + dateKey, value: capped });
  db.close();
}
