/**
 * Bot Web Worker entry point.
 *
 * Lifecycle:
 *  1. Main thread spawns the worker (Vite `?worker` import).
 *  2. Main thread posts `{ kind: "init", baseUrl }`.
 *  3. Worker fetches `enable.txt.gz` via {@link loadDictionary}, builds the trie,
 *     and posts `{ kind: "ready" }`.
 *  4. Main thread posts `{ kind: "decide", id, serializedState, difficulty }` per turn.
 *  5. Worker deserializes the state, calls {@link decide}, posts `{ kind: "decided", id, move }`.
 *
 * Errors at any stage are returned as `{ kind: "error", id, message }`; the
 * `id` is the originating request id where applicable, otherwise `null`.
 */

import { decide } from "../engine/ai/bot.js";
import type { TrieNode } from "../engine/dictionary.js";
import { loadDictionary } from "../data/load-dictionary.js";
import { deserializeGame } from "../storage/serializer.js";
import type { BotRequest, BotResponse } from "./bot-protocol.js";

// Minimal structural type for the worker's global scope. We don't pull in
// the WebWorker lib because it conflicts with the DOM lib used everywhere
// else, and we only need three properties at runtime.
interface WorkerCtx {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: MessageEvent<BotRequest>) => void): void;
  readonly location: { readonly href: string };
}
const ctx: WorkerCtx = self as unknown as WorkerCtx;

let dictPromise: Promise<TrieNode> | null = null;

function send(msg: BotResponse): void {
  ctx.postMessage(msg);
}

function ensureDictionary(baseUrl: string): Promise<TrieNode> {
  if (!dictPromise) dictPromise = loadDictionary(baseUrl);
  return dictPromise;
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

ctx.addEventListener("message", (event) => {
  const msg = event.data;

  if (msg.kind === "init") {
    void (async () => {
      try {
        await ensureDictionary(msg.baseUrl);
        send({ kind: "ready" });
      } catch (err) {
        send({ kind: "error", id: null, message: errMessage(err) });
      }
    })();
    return;
  }

  if (msg.kind === "decide") {
    void (async () => {
      try {
        // If init was skipped (or failed), fall back to the worker's own URL.
        const baseUrl = ctx.location.href;
        const dict = await ensureDictionary(baseUrl);
        const state = deserializeGame(msg.serializedState);
        const decideOptions = msg.deadline !== undefined ? { deadline: msg.deadline } : {};
        const move = decide(state, dict, msg.difficulty, decideOptions);
        send({ kind: "decided", id: msg.id, move });
      } catch (err) {
        send({ kind: "error", id: msg.id, message: errMessage(err) });
      }
    })();
    return;
  }

  // Unknown message kind — surface to caller for debugging.
  const unknown: { id?: number } = msg as { id?: number };
  send({
    kind: "error",
    id: typeof unknown.id === "number" ? unknown.id : null,
    message: `Unknown bot worker message: ${JSON.stringify(msg)}`,
  });
});
