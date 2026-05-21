/**
 * Message protocol shared between the main thread and the bot Web Worker.
 *
 * The worker is single-purpose: it owns one trie (built from the bundled
 * CSW21 wordlist) and answers `decide` requests by calling
 * {@link decide} from `src/engine/ai/bot.ts`.
 *
 * Both sides import these types so the wire format stays in sync.
 */

import type { Difficulty } from "../engine/ai/bot.js";
import type { Move } from "../engine/types.js";
import type { SerializedGameState } from "../storage/serializer.js";

/** Init: tell the worker where the dictionary lives so it can load it. */
export interface InitMessage {
  readonly kind: "init";
  /**
   * Base URL the worker should resolve `csw21.txt.gz` against. The main
   * thread reads `document.baseURI`; workers do not have access to it.
   */
  readonly baseUrl: string;
}

/** Decide: ask the worker for a move on the given state. */
export interface DecideMessage {
  readonly kind: "decide";
  readonly id: number;
  readonly serializedState: SerializedGameState;
  readonly difficulty: Difficulty;
  /** Optional epoch-ms deadline; the worker passes it through to `decide`. */
  readonly deadline?: number;
}

/** Anything the main thread may send to the worker. */
export type BotRequest = InitMessage | DecideMessage;

/** The worker has loaded its dictionary and is ready to answer `decide`. */
export interface ReadyMessage {
  readonly kind: "ready";
}

/** A `decide` request succeeded. */
export interface DecidedMessage {
  readonly kind: "decided";
  readonly id: number;
  readonly move: Move;
}

/** A `decide` request failed (deserialization, generator, etc.). */
export interface ErrorMessage {
  readonly kind: "error";
  /** `null` if the failure happened outside a decide call (e.g. init). */
  readonly id: number | null;
  readonly message: string;
}

/** Anything the worker may send back. */
export type BotResponse = ReadyMessage | DecidedMessage | ErrorMessage;
