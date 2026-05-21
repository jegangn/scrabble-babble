import { buildTrie } from "../engine/dictionary.js";
import type { TrieNode } from "../engine/dictionary.js";

/** Lookup for the gzipped wordlist relative to the app's base URL. */
const DICTIONARY_PATH = "csw21.txt.gz";

/**
 * Fetch the bundled CSW21 wordlist and build a trie. Used once on app cold start.
 *
 * Handles two cases:
 *  - The server transparently decompresses via `Content-Encoding: gzip`
 *    (Vite dev does this automatically) — we get plain UTF-8 text back.
 *  - The server returns raw gzipped bytes — we decompress via the native
 *    `DecompressionStream("gzip")` API (iPad Safari ≥ 15.4).
 *
 * The service worker (vite-plugin-pwa) caches the asset so subsequent loads
 * work offline.
 */
export async function loadDictionary(
  baseUrl = (typeof document !== "undefined" && (document as { baseURI?: string }).baseURI) || "/",
  fetchImpl: typeof fetch = fetch,
): Promise<TrieNode> {
  const url = new URL(DICTIONARY_PATH, baseUrl).toString();
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch wordlist: ${response.status} ${response.statusText}`);
  }
  const buf = await response.arrayBuffer();
  const bytes = new Uint8Array(buf);

  let text: string;
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    // Raw gzip bytes — server did not transparently decompress.
    if (typeof DecompressionStream === "undefined") {
      throw new Error(
        "DecompressionStream is unavailable. Update iPad Safari to 15.4 or newer.",
      );
    }
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
    text = await new Response(stream).text();
  } else {
    // Already-decompressed text (e.g., Vite dev returned with Content-Encoding: gzip).
    text = new TextDecoder("utf-8").decode(bytes);
  }

  const words = text.split("\n").filter((w) => w.length > 0);
  return buildTrie(words);
}
