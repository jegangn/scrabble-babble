// Verifies src/engine/ has zero React, DOM, storage, or network imports.
// Fails the build if any forbidden import is found.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ENGINE_DIR = "src/engine";
const FORBIDDEN_PATTERNS = [
  /from\s+["']react["']/,
  /from\s+["']react-dom["']/,
  /from\s+["']@dnd-kit/,
  /from\s+["']zustand/,
  /from\s+["']idb["']/,
  /\bdocument\./,
  /\bwindow\./,
  /\bnavigator\./,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bindexedDB\b/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
];

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];
for (const file of walk(ENGINE_DIR)) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(line)) {
        violations.push(`${file}:${i + 1}: ${line.trim()} (matches ${pattern})`);
      }
    }
  });
}

if (violations.length > 0) {
  console.error("Engine purity violations:");
  for (const v of violations) console.error("  " + v);
  process.exit(1);
}

console.log(`Engine purity OK (${walk(ENGINE_DIR).length} files scanned).`);
