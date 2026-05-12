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
