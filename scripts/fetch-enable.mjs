// One-time download of the public-domain ENABLE wordlist, gzipped into public/.
// Run with: bun run fetch:enable
// Re-runs are a no-op unless --force is passed.
import { existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const URL = "https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt";
const OUT = join(process.cwd(), "public", "enable.txt.gz");
const FORCE = process.argv.includes("--force");

if (existsSync(OUT) && !FORCE) {
  console.log(`enable.txt.gz already exists at ${OUT}. Pass --force to refetch.`);
  process.exit(0);
}

await mkdir(join(process.cwd(), "public"), { recursive: true });

console.log(`Fetching ${URL}…`);
const response = await fetch(URL);
if (!response.ok) {
  throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
}
const text = await response.text();
const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
console.log(`Got ${lines.length} words.`);

const normalised = lines.map((w) => w.trim().toUpperCase()).join("\n") + "\n";
const gz = gzipSync(Buffer.from(normalised, "utf8"), { level: 9 });
await writeFile(OUT, gz);
console.log(`Wrote ${OUT} (${gz.length} bytes gzipped, ${normalised.length} bytes raw).`);
