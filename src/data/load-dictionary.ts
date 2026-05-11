import { buildTrie } from "../engine/dictionary.js";
import type { TrieNode } from "../engine/dictionary.js";

/** Lookup for the gzipped wordlist relative to the app's base URL. */
const DICTIONARY_PATH = "enable.txt.gz";

/**
 * Fetch the bundled ENABLE wordlist, decompress with the native gzip stream,
 * and build a trie. Used once on app cold start.
 *
 * The service worker (vite-plugin-pwa) caches the gzipped asset on first
 * visit, so subsequent loads work offline.
 */
export async function loadDictionary(
  baseUrl = (typeof document !== "undefined" && (document as { baseURI?: string }).baseURI) || "/",
  fetchImpl: typeof fetch = fetch,
): Promise<TrieNode> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error(
      "DecompressionStream is unavailable. Update iPad Safari to 15.4 or newer.",
    );
  }
  const url = new URL(DICTIONARY_PATH, baseUrl).toString();
  const response = await fetchImpl(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch wordlist: ${response.status} ${response.statusText}`);
  }

  const ds = new DecompressionStream("gzip");
  const decompressed = response.body.pipeThrough(ds);
  const text = await new Response(decompressed).text();
  const words = text.split("\n").filter((w) => w.length > 0);
  return buildTrie(words);
}
