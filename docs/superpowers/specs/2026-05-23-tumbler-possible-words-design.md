# Spec — Tumbler "All possible words" end-screen reveal

**Date:** 2026-05-23
**Status:** Awaiting review
**Owner:** Jegan · **Engineer:** Claude Code
**Backlog ref:** "Tumbler 'show missed words' on the end screen" (docs/BACKLOG.md)

## Problem / goal

After a Tumbler round, the player sees the words they found but has no idea what was *possible* from their 7 letters. Add a section to the Tumbler end screen that reveals **every valid word the rack could make**, sorted best-first, with the player's own finds marked — presented with a brief loading shimmer followed by a staggered "cascade in" reveal.

## What it shows

A new card **"All possible words"** in the right column of the end screen, **directly below "Words you found"** (the layout is `auto-fit` two-column, so on a narrow/scaled screen it stacks underneath).

- Lists **all** dictionary words (length ≥ 2) form-able from the 7 rack letters as a multiset (each tile used at most its count) — i.e. found + missed together.
- Sorted by Tumbler score **descending** (best first), matching the "Words you found" sort.
- Words the player **found** are rendered as a success-tinted pill with a ✓; the rest are plain cream pills.
- Header shows counts, e.g. **"All possible words · 247 · you found 8"**.
- The card is **scrollable** with a capped max-height (so a 200+ word rack never blows up the page), same visual language as the existing `FoundList` pills.

## The animation

On mount of the end screen:

1. **Loading shimmer** (~500 ms): a few pulsing skeleton pills + a quiet label ("Finding every word…"). Gives the reveal a beat to land on.
2. **Cascade reveal**: words fade/slide in one after another, best-first. Per-item `animation-delay = min(index, REVEAL_CAP) * STAGGER_MS`. With `STAGGER_MS ≈ 30` and `REVEAL_CAP ≈ 40`, the first ~40 ripple in over ~1.2 s and the remainder settle in together — never tedious for a big list.
3. **Reduced motion**: when `prefers-reduced-motion: reduce`, skip the shimmer delay and the stagger — render the full list immediately. (Matches the app's existing reduced-motion handling.)

Honest note: enumeration is effectively instant (<~5 ms), so the "loading" is a deliberate, delightful reveal, not a real wait. It reads exactly as "loading then words appear."

## Engine (pure, tested)

Add to `src/engine/games/tumbler.ts`:

```
enumerateTumblerWords(rack: ReadonlyArray<Letter>, dict: TrieNode): string[]
```

- DFS the trie carrying a remaining-letter count map built from `rack`. At each node, descend into each child whose letter still has remaining count (decrement on the way down, restore on the way up). Collect a word when the node is `terminal` and depth ≥ `MIN_TUMBLER_WORD_LENGTH` (2).
- Returns uppercase words; no duplicates (trie paths are unique). Order is deterministic (trie DFS order); the UI does the score sort.
- Bounded by the rack (≤7 distinct letters, depth ≤7) → a few thousand ops worst case. No web worker needed.

Reuses the existing module's spirit (`multisetContains`, `MIN_TUMBLER_WORD_LENGTH`, `scoreTumblerWord`). Engine purity preserved (no React/DOM/storage).

## Data flow change

The end screen needs the rack, which it currently doesn't receive.

- `src/store/gameStore.ts` — extend the screen union member:
  `{ kind: "tumbler_end"; score: number; foundWords: ReadonlyArray<string>; rack: ReadonlyArray<Letter> }`
- `src/ui/screens/TumblerScreen.tsx` — the time-up handoff passes `rack`:
  `setScreen({ kind: "tumbler_end", score, foundWords, rack })` (the screen already holds `rack`).
- The end screen reads `dictionary` from the store (`useGameStore(s => s.dictionary)`) — already loaded by the time a round ends.

The screen union is transient navigation state (never persisted to IndexedDB), so there is no migration/legacy concern.

## Component

New `src/ui/components/PossibleWordsCard.tsx` (single responsibility; keeps `TumblerEndScreen` lean):

- **Props:** `{ rack: ReadonlyArray<Letter>; dictionary: TrieNode | null; foundWords: ReadonlyArray<string> }` (all `readonly`; `dictionary` typed `TrieNode | null` per `exactOptionalPropertyTypes`).
- **Behaviour:** on mount, if `dictionary` is present, compute `enumerateTumblerWords`, sort by `scoreTumblerWord` desc, store in state. Track a `phase` ("loading" → "revealed"); flip after a `REVEAL_DELAY_MS` (~500) timer (cleared on unmount). Build a `Set` of uppercased `foundWords` for O(1) found-marking.
- **Render:** card matching `FoundList` styling (paper bg, stroke, card shadow); header (`SectionLabel` + counts); a responsive pill grid; each pill `data-found` tinted/✓ when found; capped `maxHeight` + `overflow-y: auto`; reveal animation via inline `<style>` keyframes + per-pill `animationDelay`.
- **Guards:** `dictionary == null` or empty result → render nothing (no empty card). `rack` absent → `TumblerEndScreen` skips rendering the card.

Mounted in `TumblerEndScreen.tsx` right column, below the existing `<FoundList title="Words you found" …/>`.

## Verification

- **Unit tests** (`src/engine/games/__tests__/tumbler.test.ts`, extend): `enumerateTumblerWords` against the test-fixture dictionary —
  - finds all expected words from a known small rack; every result is in-dict, ≥2 letters, and multiset-form-able from the rack;
  - excludes words needing a letter not in the rack and words needing a letter more times than the rack has it;
  - a rack with no valid words returns `[]`.
- **Types/tests/build:** `npm run typecheck`, `npm run test`, `npm run build` all green. (Reminder: `bun` isn't on the Bash PATH — use `npm run`.)
- **Playwright visual pass:** drive a real Tumbler round to the end screen (or seed the `tumbler_end` state), screenshot at the iPad Pro (1366×880) and iPad Air (1180×704 via the FitToViewport canvas) sizes, and tune placement, spacing, found-marking contrast, and animation timing against the actual UI. Confirm the scrollable cap behaves and reduced-motion shows the list instantly.

## Out of scope

- No change to Tumbler gameplay, scoring, timing, or the rack draw.
- No definitions/meanings for the words (CSW21 ships defs but they're stripped; that's a separate backlog item).
- No change to the Spelling Bee end flow.
- No persistence — the possible-words list is recomputed on each visit (cheap).
