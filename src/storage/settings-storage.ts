import type { Difficulty } from "../engine/ai/bot.js";
import { migrateLegacyDifficulty } from "../engine/ai/bot.js";
import type { Variant } from "../engine/types.js";
import type { AudioConfig, SoundKey } from "../audio/sounds.js";
import { DEFAULT_AUDIO_CONFIG, PRESETS, SOUND_KEYS } from "../audio/sounds.js";
import { open } from "./db.js";

const PLAYER_NAMES_KEY = "player_names";
const OPPONENT_KEY = "opponent";
const VARIANT_KEY = "variant";
const CURRENT_USER_KEY = "current_user";
const AUDIO_KEY = "audio_settings";

/** Persisted opponent shape. Mirrors `Opponent` in gameStore. */
export type PersistedOpponent =
  | { readonly kind: "human" }
  | { readonly kind: "ai"; readonly difficulty: Difficulty };

const DEFAULT_OPPONENT: PersistedOpponent = { kind: "human" };

function isDifficulty(x: unknown): x is Difficulty {
  return (
    x === "friendly" ||
    x === "easygoing" ||
    x === "steady" ||
    x === "sharp" ||
    x === "master"
  );
}

/**
 * Loose check that returns true for either the new 5-tier IDs or the legacy
 * 3-tier IDs (easy/medium/hard). Used at the storage boundary so we accept
 * old saves and migrate them on the way in.
 */
function isDifficultyOrLegacy(x: unknown): x is string {
  if (typeof x !== "string") return false;
  if (isDifficulty(x)) return true;
  return x === "easy" || x === "medium" || x === "hard";
}

function isOpponent(x: unknown): x is PersistedOpponent {
  if (typeof x !== "object" || x === null) return false;
  const k = (x as { kind?: unknown }).kind;
  if (k === "human") return true;
  if (k === "ai") return isDifficultyOrLegacy((x as { difficulty?: unknown }).difficulty);
  return false;
}

/** Retrieve the last-used pair of player names, or defaults. */
export async function getPlayerNames(): Promise<[string, string]> {
  const db = await open();
  const entry = await db.get("settings", PLAYER_NAMES_KEY);
  db.close();
  const value = entry?.value as [string, string] | undefined;
  return value ?? ["Player 1", "Player 2"];
}

/** Persist the player names so they auto-fill on next new-game. */
export async function setPlayerNames(names: readonly [string, string]): Promise<void> {
  const db = await open();
  await db.put("settings", { key: PLAYER_NAMES_KEY, value: names });
  db.close();
}

/** Retrieve the last-used opponent, or human as default. */
export async function getOpponent(): Promise<PersistedOpponent> {
  const db = await open();
  const entry = await db.get("settings", OPPONENT_KEY);
  db.close();
  const value = entry?.value;
  if (!isOpponent(value)) return DEFAULT_OPPONENT;
  if (value.kind === "human") return value;
  // AI: migrate legacy 3-tier IDs (easy/medium/hard) to the 5-tier system.
  // A pre-Phase-5 save with `"medium"` comes back as `"steady"` so the rest
  // of the codebase only ever sees the new type.
  return {
    kind: "ai",
    difficulty: migrateLegacyDifficulty(value.difficulty as string),
  };
}

/** Persist the opponent so it auto-selects on next new-game. */
export async function setOpponent(opponent: PersistedOpponent): Promise<void> {
  const db = await open();
  await db.put("settings", { key: OPPONENT_KEY, value: opponent });
  db.close();
}

const DEFAULT_VARIANT: Variant = "classic";

function isVariant(x: unknown): x is Variant {
  return x === "classic" || x === "random" || x === "mini";
}

/** Retrieve the last-used board variant, or classic as default. */
export async function getVariant(): Promise<Variant> {
  const db = await open();
  const entry = await db.get("settings", VARIANT_KEY);
  db.close();
  const value = entry?.value;
  return isVariant(value) ? value : DEFAULT_VARIANT;
}

/** Persist the variant so it auto-selects on next new-game. */
export async function setVariant(variant: Variant): Promise<void> {
  const db = await open();
  await db.put("settings", { key: VARIANT_KEY, value: variant });
  db.close();
}

/**
 * The "current user" is the name shown on solo-mode leaderboards and pre-
 * filled into new-game forms. null on first launch — the UI prompts for a
 * name before any solo mode is played. Persisted across sessions.
 */
export async function getCurrentUser(): Promise<string | null> {
  const db = await open();
  const entry = await db.get("settings", CURRENT_USER_KEY);
  db.close();
  const value = entry?.value;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function setCurrentUser(name: string): Promise<void> {
  const trimmed = name.trim().slice(0, 24);
  if (trimmed.length === 0) return;
  const db = await open();
  await db.put("settings", { key: CURRENT_USER_KEY, value: trimmed });
  db.close();
}

// ─── Audio settings ────────────────────────────────────────────────

/** Sanitise a persisted audio entry against the current preset catalogue. */
function sanitiseAudio(raw: unknown): AudioConfig {
  if (typeof raw !== "object" || raw === null) return DEFAULT_AUDIO_CONFIG;
  const r = raw as { presets?: unknown; volumes?: unknown };
  const presets: Record<SoundKey, string> = { ...DEFAULT_AUDIO_CONFIG.presets };
  const volumes: Record<SoundKey, number> = { ...DEFAULT_AUDIO_CONFIG.volumes };
  if (typeof r.presets === "object" && r.presets !== null) {
    const p = r.presets as Record<string, unknown>;
    for (const k of SOUND_KEYS) {
      const id = p[k];
      if (typeof id === "string" && PRESETS[k].some((preset) => preset.id === id)) {
        presets[k] = id;
      }
    }
  }
  if (typeof r.volumes === "object" && r.volumes !== null) {
    const v = r.volumes as Record<string, unknown>;
    for (const k of SOUND_KEYS) {
      const vol = v[k];
      if (typeof vol === "number" && Number.isFinite(vol)) {
        volumes[k] = Math.max(0, Math.min(1.5, vol));
      }
    }
  }
  return { presets, volumes };
}

/** Retrieve saved audio settings; falls back to factory defaults. */
export async function getAudioSettings(): Promise<AudioConfig> {
  const db = await open();
  const entry = await db.get("settings", AUDIO_KEY);
  db.close();
  return sanitiseAudio(entry?.value);
}

/** Persist the user's audio choices. */
export async function setAudioSettings(config: AudioConfig): Promise<void> {
  const db = await open();
  await db.put("settings", { key: AUDIO_KEY, value: config });
  db.close();
}
