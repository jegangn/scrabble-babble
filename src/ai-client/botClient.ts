/**
 * Promise-based wrapper around the bot Web Worker.
 *
 * Usage:
 *   const move = await getBotMove(state, "medium");
 *
 * The worker is lazily spawned on first call. It loads the dictionary itself
 * (see `src/workers/bot.worker.ts`). Subsequent calls reuse the same instance.
 *
 * Every request is bounded by a 4 800 ms timeout (200 ms safety margin under
 * the project's 5 s spec). The bot's internal `deadline` is set 200 ms tighter
 * still, so the worker returns its best-found move before the client gives up.
 */

import type { Difficulty } from "../engine/ai/bot.js";
import type { GameState, Move } from "../engine/types.js";
import { serializeGame } from "../storage/serializer.js";
import type { BotRequest, BotResponse } from "../workers/bot-protocol.js";
// Vite-specific `?worker` suffix returns a Worker constructor.
// The path is resolved at build time and bundled.
import BotWorker from "../workers/bot.worker.ts?worker";

/** Default upper bound on a single `getBotMove` call. */
export const DEFAULT_TIMEOUT_MS = 4800;
/** How much sooner the bot itself should stop, so we get a move before timeout. */
const INTERNAL_DEADLINE_MARGIN_MS = 200;

interface Pending {
  readonly resolve: (move: Move) => void;
  readonly reject: (err: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function ensureWorker(): Worker {
  if (worker) return worker;
  const w = new BotWorker();
  w.addEventListener("message", handleMessage);
  w.addEventListener("error", handleWorkerError);
  // Tell the worker where to fetch the dictionary from.
  const baseUrl =
    typeof document !== "undefined" && (document as { baseURI?: string }).baseURI
      ? (document as { baseURI: string }).baseURI
      : "/";
  const initMsg: BotRequest = { kind: "init", baseUrl };
  w.postMessage(initMsg);
  worker = w;
  return w;
}

function handleMessage(event: MessageEvent<BotResponse>): void {
  const msg = event.data;
  if (msg.kind === "decided") {
    const slot = pending.get(msg.id);
    if (!slot) return; // already timed out
    pending.delete(msg.id);
    clearTimeout(slot.timer);
    slot.resolve(msg.move);
    return;
  }
  if (msg.kind === "error") {
    if (msg.id !== null) {
      const slot = pending.get(msg.id);
      if (slot) {
        pending.delete(msg.id);
        clearTimeout(slot.timer);
        slot.reject(new Error(msg.message));
      }
    }
    // init-time errors with id=null are surfaced on the next decide call's
    // ensureWorker → init → ready chain when we add wait-for-ready. Today
    // they only land in the console via the worker's own error event.
    return;
  }
  // "ready" — nothing to do; getBotMove doesn't block on it.
}

function handleWorkerError(event: Event): void {
  const message =
    event instanceof ErrorEvent && event.message
      ? event.message
      : "Bot worker crashed";
  // Reject every outstanding request; force a fresh worker on next call.
  for (const [, slot] of pending) {
    clearTimeout(slot.timer);
    slot.reject(new Error(message));
  }
  pending.clear();
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

/**
 * Ask the bot for a move. Resolves with the chosen {@link Move}, rejects on
 * timeout or worker error.
 *
 * @param state — the current game state (will be serialized for transport)
 * @param difficulty — Easy / Medium / Hard
 * @param timeoutMs — defaults to {@link DEFAULT_TIMEOUT_MS}
 */
export function getBotMove(
  state: GameState,
  difficulty: Difficulty,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Move> {
  const w = ensureWorker();
  return new Promise<Move>((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Bot timed out after ${timeoutMs} ms`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });

    const internalDeadline = Date.now() + Math.max(0, timeoutMs - INTERNAL_DEADLINE_MARGIN_MS);
    const req: BotRequest = {
      kind: "decide",
      id,
      serializedState: serializeGame(state),
      difficulty,
      deadline: internalDeadline,
    };
    w.postMessage(req);
  });
}

/**
 * Terminate the worker and reject all outstanding requests. Mostly useful for
 * tests and for releasing memory if the app navigates away from a game.
 */
export function disposeBotClient(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  for (const [, slot] of pending) {
    clearTimeout(slot.timer);
    slot.reject(new Error("Bot client disposed"));
  }
  pending.clear();
}
