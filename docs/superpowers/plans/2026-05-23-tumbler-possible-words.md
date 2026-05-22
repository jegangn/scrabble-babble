# Tumbler "All possible words" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the Tumbler end screen, reveal every valid word the rack could make (best-first, the player's finds marked) with a brief loading shimmer then a staggered cascade-in.

**Architecture:** A pure, unit-tested `enumerateTumblerWords(rack, dict)` trie-walk in the engine; the rack threaded through the `tumbler_end` screen state; and a self-contained `PossibleWordsCard` component (compute → shimmer → staggered reveal) mounted below "Words you found".

**Tech Stack:** Vite + React 18 + TypeScript (strict), Zustand, Vitest (node env), CSS keyframes.

**Spec:** `docs/superpowers/specs/2026-05-23-tumbler-possible-words-design.md`

**Conventions:**
- `bun` is NOT on the Bash PATH — use **`npm run typecheck`**, **`npm run test`**, **`npm run build`** (and `npm run test -- <filter>` for one file).
- Work on `main`; commit locally per task; the controller pushes after the visual pass.
- TS strict: no `any`, no unjustified `as`; ESM `.js` import suffixes; `readonly` props.
- Every commit message ends with: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

---

## File Structure

- **Modify** `src/engine/games/tumbler.ts` — add pure `enumerateTumblerWords`.
- **Modify** `src/engine/games/__tests__/tumbler.test.ts` — add a `describe` block for it.
- **Modify** `src/store/gameStore.ts` — add `rack` to the `tumbler_end` screen union member.
- **Modify** `src/ui/screens/TumblerScreen.tsx` — pass `rack` in the end-of-round handoff.
- **Create** `src/ui/components/PossibleWordsCard.tsx` — the card (compute + shimmer + reveal).
- **Modify** `src/ui/screens/TumblerEndScreen.tsx` — mount the card below "Words you found".

---

## Task 1: Engine — `enumerateTumblerWords`

**Files:**
- Modify: `src/engine/games/tumbler.ts`
- Test: `src/engine/games/__tests__/tumbler.test.ts`

- [ ] **Step 1: Write failing tests.** Append to `src/engine/games/__tests__/tumbler.test.ts`. Also add `enumerateTumblerWords` to the existing import from `../tumbler.js` at the top of the file (it currently imports `MIN_TUMBLER_WORD_LENGTH, TUMBLER_RACK_SIZE, drawTumblerLetters, scoreTumblerWord, validateTumblerWord`).

```ts
describe("enumerateTumblerWords", () => {
  const SMALL = buildTrie([
    "AT", "TA", "ACT", "CAT", "CATS", "CAST", "SCAT", "CAR", "ARC", "RAT", "TAR", "ART", "A", "I",
  ]);

  it("finds every word formable from the rack (>=2 letters, multiset)", () => {
    const rack: Letter[] = ["C", "A", "T", "S"];
    const got = [...enumerateTumblerWords(rack, SMALL)].sort();
    expect(got).toEqual(["ACT", "AT", "CAST", "CAT", "CATS", "SCAT", "TA"]);
  });

  it("excludes words needing a letter the rack lacks", () => {
    const rack: Letter[] = ["C", "A", "T"]; // no S or R
    const got = [...enumerateTumblerWords(rack, SMALL)].sort();
    expect(got).toEqual(["ACT", "AT", "CAT", "TA"]);
  });

  it("respects multiset counts and returns [] when nothing fits", () => {
    const twoE = buildTrie(["EYE", "EWE", "BEE"]); // each needs two E's
    const rack: Letter[] = ["E", "Y", "W", "B"]; // only one E
    expect(enumerateTumblerWords(rack, twoE)).toEqual([]);
  });

  it("never returns single-letter words even when the dict has them", () => {
    const rack: Letter[] = ["A", "I", "T"];
    const got = enumerateTumblerWords(rack, SMALL);
    expect(got).not.toContain("A");
    expect(got).not.toContain("I");
    for (const w of got) expect(w.length).toBeGreaterThanOrEqual(MIN_TUMBLER_WORD_LENGTH);
  });

  it("every result is accepted by validateTumblerWord for the rack (fixture dict)", () => {
    const rack: Letter[] = ["C", "A", "T", "S", "R", "E", "N"];
    const words = enumerateTumblerWords(rack, DICT);
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) {
      expect(validateTumblerWord(rack, w, DICT)).toEqual({ ok: true });
    }
    expect(words).toContain("CAT");
    expect(words).toContain("CATS");
  });
});
```

- [ ] **Step 2: Run, verify FAIL.** `npm run test -- tumbler` → fails (`enumerateTumblerWords` not exported).

- [ ] **Step 3: Implement.** Append to `src/engine/games/tumbler.ts`:

```ts
/**
 * Enumerate every dictionary word (length >= MIN_TUMBLER_WORD_LENGTH) that
 * can be formed from `rack` as a multiset — each tile used at most as many
 * times as it appears in the rack. Pure DFS over the trie; bounded by the
 * rack (<= 7 distinct letters, depth <= 7), so a few thousand ops worst case.
 *
 * Returns uppercase words in trie-DFS order (deterministic); callers sort.
 * No duplicates (trie paths are unique).
 */
export function enumerateTumblerWords(
  rack: ReadonlyArray<Letter>,
  dict: TrieNode,
): string[] {
  const remaining = new Map<string, number>();
  for (const l of rack) remaining.set(l, (remaining.get(l) ?? 0) + 1);

  const results: string[] = [];
  const path: string[] = [];

  const walk = (node: TrieNode): void => {
    if (node.terminal && path.length >= MIN_TUMBLER_WORD_LENGTH) {
      results.push(path.join(""));
    }
    for (const [letter, child] of node.children) {
      const left = remaining.get(letter) ?? 0;
      if (left <= 0) continue;
      remaining.set(letter, left - 1);
      path.push(letter);
      walk(child);
      path.pop();
      remaining.set(letter, left);
    }
  };

  walk(dict);
  return results;
}
```

- [ ] **Step 4: Run, verify PASS.** `npm run test -- tumbler` → all green (existing + 5 new).
- [ ] **Step 5: Typecheck.** `npm run typecheck` → zero errors.
- [ ] **Step 6: Commit.**
```bash
git add src/engine/games/tumbler.ts src/engine/games/__tests__/tumbler.test.ts
git commit -m "feat(tumbler): enumerateTumblerWords trie walk + tests" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Thread the rack into the end-screen state

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/ui/screens/TumblerScreen.tsx`

`Letter` is already imported in `gameStore.ts`. Adding a required `rack` field means the one place that constructs `tumbler_end` (TumblerScreen) must pass it — both edits are in this task, so typecheck stays green.

- [ ] **Step 1: Extend the screen union.** In `src/store/gameStore.ts`, find:

```ts
  | { kind: "tumbler_end"; score: number; foundWords: ReadonlyArray<string> }
```

Replace with:

```ts
  | { kind: "tumbler_end"; score: number; foundWords: ReadonlyArray<string>; rack: ReadonlyArray<Letter> }
```

- [ ] **Step 2: Pass the rack in the handoff.** In `src/ui/screens/TumblerScreen.tsx`, find:

```tsx
      setScreen({ kind: "tumbler_end", score, foundWords });
```

Replace with:

```tsx
      setScreen({ kind: "tumbler_end", score, foundWords, rack });
```

(`rack` is already in scope — the `useMemo` rack at the top of the component.)

- [ ] **Step 3: Typecheck + tests.** `npm run typecheck` (zero errors — proves no other construction site was missed) and `npm run test` (still green).
- [ ] **Step 4: Commit.**
```bash
git add src/store/gameStore.ts src/ui/screens/TumblerScreen.tsx
git commit -m "feat(tumbler): pass rack into tumbler_end screen state" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `PossibleWordsCard` component

**Files:**
- Create: `src/ui/components/PossibleWordsCard.tsx`

No unit test (Vitest is node-env with no jsdom; the only logic — enumeration — is tested in Task 1). Verified live in Task 5. Matches the existing `FoundList` card/pill styling for visual consistency.

- [ ] **Step 1: Implement.** Create `src/ui/components/PossibleWordsCard.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { enumerateTumblerWords, scoreTumblerWord } from "../../engine/games/tumbler.js";
import type { TrieNode } from "../../engine/dictionary.js";
import type { Letter } from "../../engine/types.js";
import { tokens } from "../tokens.js";
import { SectionLabel } from "./SectionLabel.js";

export interface PossibleWordsCardProps {
  readonly rack: ReadonlyArray<Letter>;
  readonly dictionary: TrieNode | null;
  readonly foundWords: ReadonlyArray<string>;
}

// Reveal tuning (adjusted live in the Playwright/preview pass).
const REVEAL_DELAY_MS = 500; // shimmer duration before words cascade in
const STAGGER_MS = 28; // gap between consecutive word reveals
const REVEAL_CAP = 40; // index beyond which words stop staggering (appear together)
const SKELETON_COUNT = 10;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * End-of-round "All possible words" card for Tumbler. Lists every valid word
 * the rack could make (best-first), the player's finds tinted + ticked. Shows
 * a brief shimmer, then cascades the words in. Renders nothing if there's no
 * dictionary or no possible words.
 */
export function PossibleWordsCard({
  rack,
  dictionary,
  foundWords,
}: PossibleWordsCardProps): JSX.Element | null {
  const { color, radius, shadow, space, size, weight, font } = tokens;

  const words = useMemo(() => {
    if (!dictionary) return [];
    return [...enumerateTumblerWords(rack, dictionary)].sort(
      (a, b) => scoreTumblerWord(b) - scoreTumblerWord(a),
    );
  }, [dictionary, rack]);

  const foundSet = useMemo(
    () => new Set(foundWords.map((w) => w.toUpperCase())),
    [foundWords],
  );

  const [reduced] = useState(prefersReducedMotion);
  const [revealed, setRevealed] = useState(reduced);
  useEffect(() => {
    if (reduced) return;
    const t = window.setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [reduced]);

  if (!dictionary || words.length === 0) return null;

  const foundCount = words.reduce((n, w) => (foundSet.has(w) ? n + 1 : n), 0);

  return (
    <div
      style={{
        background: color.paper,
        border: `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        boxShadow: shadow.card,
        padding: space.x4,
        display: "flex",
        flexDirection: "column",
        gap: space.x3,
      }}
    >
      <style>{`
        @keyframes pwFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pwPulse { 0%, 100% { opacity: .35; } 50% { opacity: .7; } }
        .pw-pill { animation: pwFadeIn 280ms ease-out both; }
        .pw-skel { animation: pwPulse 1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .pw-pill { animation: none !important; opacity: 1 !important; transform: none !important; }
          .pw-skel { animation: none !important; }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: space.x3 }}>
        <SectionLabel style={{ margin: 0 }}>All possible words</SectionLabel>
        <span style={{ fontSize: size.caption, color: color.inkSoft, fontVariantNumeric: "tabular-nums" }}>
          {revealed ? `${words.length} · you found ${foundCount}` : "Finding every word…"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))",
          gap: 6,
          overflowY: "auto",
          maxHeight: 300,
          minHeight: 0,
          paddingRight: 4,
        }}
      >
        {!revealed
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <span
                key={i}
                className="pw-skel"
                aria-hidden
                style={{
                  height: 30,
                  background: color.cream,
                  border: `1px solid ${color.strokeSoft}`,
                  borderRadius: radius.chip,
                }}
              />
            ))
          : words.map((w, i) => {
              const isFound = foundSet.has(w);
              return (
                <span
                  key={w}
                  className="pw-pill"
                  style={{
                    animationDelay: `${Math.min(i, REVEAL_CAP) * STAGGER_MS}ms`,
                    background: isFound ? color.successBg : color.cream,
                    border: `1px solid ${isFound ? color.success : color.strokeSoft}`,
                    borderRadius: radius.chip,
                    padding: "6px 10px",
                    fontSize: size.caption,
                    fontWeight: weight.med,
                    color: isFound ? color.success : color.ink,
                    textAlign: "center",
                    fontFamily: font.serif,
                    letterSpacing: ".02em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={w}
                >
                  {isFound ? `✓ ${w}` : w}
                </span>
              );
            })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + tests.** `npm run typecheck` (zero errors) and `npm run test` (all green — component isn't imported yet, suite unchanged).
- [ ] **Step 3: Commit.**
```bash
git add src/ui/components/PossibleWordsCard.tsx
git commit -m "feat(tumbler): PossibleWordsCard (shimmer + cascade reveal)" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Mount the card on the end screen

**Files:**
- Modify: `src/ui/screens/TumblerEndScreen.tsx`

- [ ] **Step 1: Add the import.** After the existing `import { FoundList } ...` line, add:

```tsx
import { PossibleWordsCard } from "../components/PossibleWordsCard.js";
```

- [ ] **Step 2: Read the dictionary from the store.** Find:

```tsx
  const currentUser = useGameStore((s) => s.currentUser);
```

Add directly below it:

```tsx
  const dictionary = useGameStore((s) => s.dictionary);
```

- [ ] **Step 3: Destructure the rack.** Find:

```tsx
  const { score, foundWords } = screen;
```

Replace with:

```tsx
  const { score, foundWords, rack } = screen;
```

- [ ] **Step 4: Render the card under "Words you found".** Find:

```tsx
        {/* Right — words grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: space.x4 }}>
          <FoundList
            title="Words you found"
            count={foundWords.length}
            columns={3}
            words={sortedWords}
          />
        </div>
```

Replace with:

```tsx
        {/* Right — words grid + all-possible reveal */}
        <div style={{ display: "flex", flexDirection: "column", gap: space.x4 }}>
          <FoundList
            title="Words you found"
            count={foundWords.length}
            columns={3}
            words={sortedWords}
          />
          <PossibleWordsCard rack={rack} dictionary={dictionary} foundWords={foundWords} />
        </div>
```

- [ ] **Step 5: Typecheck + tests + build.** `npm run typecheck` (zero), `npm run test` (green), `npm run build` (succeeds; confirm `dist/assets/bot.worker-*.js` still emitted).
- [ ] **Step 6: Commit.**
```bash
git add src/ui/screens/TumblerEndScreen.tsx
git commit -m "feat(tumbler): show All possible words on the end screen" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Visual pass + tune (controller-run)

The `@playwright/test` runner's `webServer` uses `bun run preview` (no bun on this Bash PATH) and the existing Tumbler e2e spec is stale, so use the **Claude Preview MCP** browser (vite via node — already working) for the visual pass. Reaching the end screen means skipping the 60s timer, so temporarily shorten the round.

- [ ] **Step 1: Temporarily shorten the round.** In `src/engine/games/tumbler.ts`, change `export const TUMBLER_DURATION_MS = 60_000;` to `4_000` (HMR reloads). This is reverted in Step 5.
- [ ] **Step 2: Drive to the end screen.** `preview_start` ("dev"); navigate Home → Tumbler; tap rack pills to form a valid word and Submit once or twice (so `foundWords` is non-empty and some pills show the ✓), then let the 4s elapse → end screen.
- [ ] **Step 3: Verify + tune at iPad Pro (resize 1366×880).** Confirm via `preview_eval` / screenshot: the "All possible words" card sits directly below "Words you found"; header reads `… · you found N`; pills cascade in (shimmer first); found words are tinted + ticked; the grid scrolls within `maxHeight` for a big list. Tune `REVEAL_DELAY_MS` / `STAGGER_MS` / `REVEAL_CAP` / `maxHeight` if the pace or height feels off. Also confirm the two cards stack cleanly (no FoundList `flex:1` height weirdness); if needed, cap the FoundList area.
- [ ] **Step 4: Verify at iPad Air (resize 1180×704, reload so FitToViewport mounts active).** Confirm the card and its scroll work inside the zoomed canvas and nothing clips.
- [ ] **Step 5: Revert the timer.** Set `TUMBLER_DURATION_MS` back to `60_000`. Run `npm run typecheck` + `npm run test` + `npm run build` (all green) and confirm `git status` shows no leftover debug edits.

---

## Self-review

- **Spec coverage:** all-possible list best-first (Task 3 sort) ✓; found marked + counts (Task 3) ✓; placement below "Words you found" (Task 4) ✓; shimmer→cascade + reduced-motion (Task 3) ✓; pure tested enumerator (Task 1) ✓; rack plumbing, no migration (Task 2) ✓; Playwright/preview visual pass at Pro+Air (Task 5) ✓.
- **Type consistency:** `enumerateTumblerWords(rack, dict)` defined in Task 1 is imported with the same signature in Task 3; `PossibleWordsCardProps` defined in Task 3 matches the props passed in Task 4; the `rack` field added in Task 2 is consumed in Task 4.
- **No placeholders:** every code block is complete. (Reveal constants are real, tunable values, set in Step 5 of Task 5.)
