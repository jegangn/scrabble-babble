/**
 * Compact trie for word lookup.
 *
 * Phase 0 uses the curated fixture in `__fixtures__/dictionary-subset.ts`.
 * Phase 1+ will load the full CSW21 wordlist (~279k words) and cache the
 * built trie in IndexedDB.
 */

/** A trie node. `children` maps single uppercase letters to subtrees. */
export interface TrieNode {
  readonly children: ReadonlyMap<string, TrieNode>;
  readonly terminal: boolean;
}

interface MutableTrieNode {
  children: Map<string, MutableTrieNode>;
  terminal: boolean;
}

/**
 * Build a trie from a list of words. Letters are uppercased; the empty string is ignored.
 *
 * @example
 * const trie = buildTrie(["CAT", "CATS"]);
 * lookup(trie, "cat");  // true
 * hasPrefix(trie, "ca"); // true
 */
export function buildTrie(words: ReadonlyArray<string>): TrieNode {
  const root: MutableTrieNode = { children: new Map(), terminal: false };
  for (const word of words) {
    if (word.length === 0) continue;
    let node = root;
    for (const ch of word.toUpperCase()) {
      let next = node.children.get(ch);
      if (!next) {
        next = { children: new Map(), terminal: false };
        node.children.set(ch, next);
      }
      node = next;
    }
    node.terminal = true;
  }
  return root;
}

/** Does the trie contain `word` as a complete entry? Case-insensitive. */
export function lookup(trie: TrieNode, word: string): boolean {
  if (word.length === 0) return false;
  let node: TrieNode = trie;
  for (const ch of word.toUpperCase()) {
    const next = node.children.get(ch);
    if (!next) return false;
    node = next;
  }
  return node.terminal;
}

/**
 * Is `prefix` the start of any word in the trie? An empty prefix returns true.
 * Useful for AI move generation in Phase 2+.
 */
export function hasPrefix(trie: TrieNode, prefix: string): boolean {
  let node: TrieNode = trie;
  for (const ch of prefix.toUpperCase()) {
    const next = node.children.get(ch);
    if (!next) return false;
    node = next;
  }
  return true;
}
