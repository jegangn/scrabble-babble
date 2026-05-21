// One-time download + normalisation of the Collins Scrabble Words 2021 (CSW21) list.
//
// Source: https://github.com/scrabblewords/scrabblewords  (words/British/CSW21.txt)
// CSW21 is © HarperCollins Publishers Limited, published under licence with Collins and
// redistributed by the scrabblewords project. We strip the definitions and keep only the
// bare uppercase words. See docs/IP_DIVERGENCES.md for attribution.
//
// Run with: bun run fetch:csw21   (or: node scripts/fetch-csw21.mjs)
// Re-runs are a no-op unless --force is passed.
import { existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const URL =
  "https://raw.githubusercontent.com/scrabblewords/scrabblewords/main/words/British/CSW21.txt";
const OUT = join(PUBLIC_DIR, "csw21.txt.gz");
const FORCE = process.argv.includes("--force");

if (existsSync(OUT) && !FORCE) {
  console.log(`csw21.txt.gz already exists at ${OUT}. Pass --force to refetch.`);
  process.exit(0);
}

await mkdir(PUBLIC_DIR, { recursive: true });

console.log(`Fetching ${URL}…`);
const response = await fetch(URL);
if (!response.ok) {
  throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
}
const text = await response.text();

// Source lines look like: "QI (Chinese) a life force, also KI [n -S]".
// Comment lines (e.g. the licence header) start with "#". Keep only the first
// whitespace-delimited token, uppercased, restricted to A–Z and 2–15 letters
// (Scrabble length bounds), de-duplicated and sorted to match the old ENABLE file.
const seen = new Set();
for (const line of text.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
  const word = trimmed.split(/\s+/)[0].toUpperCase();
  if (/^[A-Z]{2,15}$/.test(word)) seen.add(word);
}
const words = [...seen].sort();
console.log(`Parsed ${words.length} words.`);

const normalised = words.join("\n") + "\n";
const gz = gzipSync(Buffer.from(normalised, "utf8"), { level: 9 });
await writeFile(OUT, gz);
console.log(`Wrote ${OUT} (${gz.length} bytes gzipped, ${normalised.length} bytes raw).`);
