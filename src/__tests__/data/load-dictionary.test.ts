import { describe, expect, it } from "vitest";
import { gzipSync } from "node:zlib";
import { loadDictionary } from "../../data/load-dictionary.js";
import { lookup } from "../../engine/dictionary.js";

function gzippedWordlist(words: ReadonlyArray<string>): ArrayBuffer {
  const text = words.join("\n") + "\n";
  const buf = gzipSync(Buffer.from(text, "utf8"));
  // Copy into a plain ArrayBuffer so the DOM types accept it as BlobPart.
  const out = new ArrayBuffer(buf.byteLength);
  new Uint8Array(out).set(buf);
  return out;
}

describe("loadDictionary", () => {
  it("decompresses a gzipped wordlist and builds a usable trie", async () => {
    const bytes = gzippedWordlist(["CAT", "DOG", "BIRD"]);
    const fakeFetch: typeof fetch = async () =>
      new Response(new Blob([bytes]), {
        status: 200,
        headers: { "Content-Type": "application/gzip" },
      });

    const trie = await loadDictionary("http://example.test/", fakeFetch);
    expect(lookup(trie, "CAT")).toBe(true);
    expect(lookup(trie, "DOG")).toBe(true);
    expect(lookup(trie, "FISH")).toBe(false);
  });

  it("throws when the fetch fails", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(null, { status: 404, statusText: "Not Found" });
    await expect(loadDictionary("http://example.test/", fakeFetch)).rejects.toThrow();
  });
});
