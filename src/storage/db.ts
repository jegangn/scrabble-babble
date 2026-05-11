import { openDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";
import type { SerializedGameState } from "./serializer.js";

export interface HistoryEntry {
  readonly id: string;
  readonly endedAt: number;
  readonly game: SerializedGameState;
}

export interface SettingsValue {
  readonly key: string;
  readonly value: unknown;
}

export interface SBSchema extends DBSchema {
  in_progress: {
    key: string;
    value: SerializedGameState;
  };
  history: {
    key: string;
    value: HistoryEntry;
  };
  settings: {
    key: string;
    value: SettingsValue;
  };
}

const DB_NAME = "scrabble-babble";
const DB_VERSION = 1;

/** Open (or create) the app's IndexedDB. */
export function open(): Promise<IDBPDatabase<SBSchema>> {
  return openDB<SBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("in_progress")) {
        db.createObjectStore("in_progress");
      }
      if (!db.objectStoreNames.contains("history")) {
        db.createObjectStore("history", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    },
  });
}

export const IN_PROGRESS_KEY = "current";
