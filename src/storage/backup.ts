import type { HistoryEntry, SettingsValue } from "./db.js";
import { IN_PROGRESS_KEY, open } from "./db.js";
import type { SerializedGameState } from "./serializer.js";
import { deserializeGame } from "./serializer.js";

/**
 * Full-backup format (version 1).
 *
 * Captures EVERYTHING the app persists — in-progress Scrabble game,
 * the completed-game history, and every settings row (player names,
 * opponent + variant, audio config, current user, Tumbler personal
 * best + leaderboard, every per-day Bee progress and per-day Bee
 * leaderboard).
 *
 * Designed for one specific real-world scenario: the user plays in
 * Safari, installs the PWA via "Add to Home Screen", and wants
 * everything to come along. iOS keeps Safari and standalone-PWA
 * storage in separate buckets in some configurations, so the only
 * reliable transfer path is export-from-A, import-into-B.
 */
export interface FullBackupV1 {
  readonly kind: "scrabble-babble-backup";
  readonly version: 1;
  readonly exportedAt: string;
  readonly inProgress: SerializedGameState | null;
  readonly history: ReadonlyArray<HistoryEntry>;
  readonly settings: ReadonlyArray<SettingsValue>;
}

/** Outcome of an import. The UI uses this to decide what to reload / refresh. */
export interface ImportResult {
  readonly mode: "full" | "legacy-game";
  /** Number of new history rows added (full-backup imports). */
  readonly historyAdded?: number;
  /** Number of settings keys overwritten (full-backup imports). */
  readonly settingsApplied?: number;
}

/**
 * Read every row out of IDB and assemble a full backup. Closes the DB
 * before returning so the caller never sees a half-open handle.
 */
export async function buildFullBackup(): Promise<FullBackupV1> {
  const db = await open();
  const [inProgress, history, settings] = await Promise.all([
    db.get("in_progress", IN_PROGRESS_KEY),
    db.getAll("history"),
    db.getAll("settings"),
  ]);
  db.close();
  return {
    kind: "scrabble-babble-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    inProgress: inProgress ?? null,
    history,
    settings,
  };
}

/** Serialise a backup to a JSON string suitable for a Blob download. */
export function backupToJSON(backup: FullBackupV1): string {
  return JSON.stringify(backup);
}

function isHistoryEntry(x: unknown): x is HistoryEntry {
  if (typeof x !== "object" || x === null) return false;
  const o = x as { id?: unknown; endedAt?: unknown; game?: unknown };
  return (
    typeof o.id === "string" &&
    typeof o.endedAt === "number" &&
    typeof o.game === "object" &&
    o.game !== null
  );
}

function isSettingsValue(x: unknown): x is SettingsValue {
  if (typeof x !== "object" || x === null) return false;
  const o = x as { key?: unknown };
  return typeof o.key === "string";
}

function isFullBackupV1(x: unknown): x is FullBackupV1 {
  if (typeof x !== "object" || x === null) return false;
  const o = x as {
    kind?: unknown;
    version?: unknown;
    inProgress?: unknown;
    history?: unknown;
    settings?: unknown;
  };
  if (o.kind !== "scrabble-babble-backup") return false;
  if (o.version !== 1) return false;
  if (!Array.isArray(o.history)) return false;
  if (!Array.isArray(o.settings)) return false;
  return true;
}

/**
 * Parse a JSON string and restore everything it contains.
 *
 *   - "scrabble-babble-backup" v1: restores in-progress (replace),
 *     history (merge by id — existing rows are kept, imported rows
 *     fill in any missing ids), and settings (overwrite by key).
 *   - Legacy single-game JSON: same as the original importer —
 *     restores ONLY the in-progress slot. Used for files exported
 *     before the full-backup format existed.
 *
 * Returns an {@link ImportResult} so the caller can show a sensible
 * confirmation message instead of just "imported".
 */
export async function importFromJSON(json: string): Promise<ImportResult> {
  const parsed: unknown = JSON.parse(json);

  if (isFullBackupV1(parsed)) {
    return await applyFullBackup(parsed);
  }

  // Legacy fallback — same shape `fromJSON` used to consume. Validate
  // by attempting deserialisation; if it throws, the file is unusable
  // and we let the error propagate to the UI.
  const game = deserializeGame(parsed as SerializedGameState);
  const db = await open();
  await db.put("in_progress", parsed as SerializedGameState, IN_PROGRESS_KEY);
  db.close();
  // Surface the deserialised game to satisfy unused-variable lint; the
  // caller already triggers hydrate(...) so we don't return it.
  void game;
  return { mode: "legacy-game" };
}

async function applyFullBackup(backup: FullBackupV1): Promise<ImportResult> {
  const db = await open();
  // Single transaction across all three stores so a half-applied
  // import can't leave the DB inconsistent (e.g., settings restored
  // but history wiped).
  const tx = db.transaction(["in_progress", "history", "settings"], "readwrite");
  const inProgressStore = tx.objectStore("in_progress");
  const historyStore = tx.objectStore("history");
  const settingsStore = tx.objectStore("settings");

  // In-progress: replace whatever's there (the imported one is the
  // user's intent — they want to continue from the source device).
  if (backup.inProgress) {
    await inProgressStore.put(backup.inProgress, IN_PROGRESS_KEY);
  } else {
    await inProgressStore.delete(IN_PROGRESS_KEY);
  }

  // History: merge by id. Keep every existing row, add any imported
  // rows that don't already exist. This way importing on a device
  // that already has its own completed games doesn't lose them.
  let historyAdded = 0;
  const existingIds = new Set<string>();
  for (const row of await historyStore.getAll()) {
    existingIds.add(row.id);
  }
  for (const entry of backup.history) {
    if (!isHistoryEntry(entry)) continue;
    if (existingIds.has(entry.id)) continue;
    await historyStore.put(entry);
    historyAdded++;
  }

  // Settings: overwrite by key. Tumbler best, Bee progress / per-day
  // leaderboards, player names, audio config — imported values win.
  let settingsApplied = 0;
  for (const row of backup.settings) {
    if (!isSettingsValue(row)) continue;
    await settingsStore.put(row);
    settingsApplied++;
  }

  await tx.done;
  db.close();
  return { mode: "full", historyAdded, settingsApplied };
}
