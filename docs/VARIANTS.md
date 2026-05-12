# Variants

| Variant | Board | Bag | Dictionary | Opponent | Phase |
|---|---|---|---|---|---|
| Classic | 15×15 fixed layout | 104 | ENABLE | Hot-seat or AI | 1, 2 |
| Random | 15×15 randomized symmetric layout | 104 | ENABLE | Hot-seat or AI | 3 |
| Mini | 11×11 scaled layout | 60 | ENABLE | Hot-seat or AI | 3 |
| Tumbler | n/a — 7 letters, 60s, free-form | n/a | ENABLE | Solo, personal best | 4 |
| Spelling Bee | 7-letter hex, center mandatory | n/a | ENABLE | Solo, daily seeded | 4 |

## Module Reuse

- Classic, Random, and Mini share the full board engine (`board.ts`, `validator.ts`, `scorer.ts`, `game.ts`) with different `BoardConfig` (size, premium grid) and different `TileDistribution` (Mini gets a scaled bag).
- Tumbler and Spelling Bee are independent modules that only consume `dictionary.ts`. They do not use the board, validator, or scorer.
- All variants share `src/engine/dictionary.ts` and the same ENABLE trie.

## Variant-specific deltas

- **Random** (Phase 3): at game start, `generateRandomBoard(prng)` picks a fresh layout while preserving 4-fold symmetry and Classic's (8 TW / 9 DW / 16 TL / 24 DL) counts. The corner orbit is pinned to TW for a Classic-feeling opening, and TW orbits orthogonally or diagonally adjacent to the centre are blocked so a 2-tile opener can't combine TW × DW.
- **Mini 11×11** (Phase 3): finalised counts: **4 TW / 5 DW (incl. centre) / 8 TL / 12 DL** = 29 premiums on 121 cells (24 % vs Classic's 25 %). Bag totals **60 tiles** — halved from Classic with vowels and connective consonants rounded up to keep the vowel ratio within 5 % of Classic. Letter values are unchanged. 1 blank instead of 2. Rack stays at 7. All other rules (bingo bonus +35, 4-consecutive-pass end, swap legality) are unchanged.
- **Tumbler** (Phase 4): pull 7 random tiles, 60-second timer, score by sum of (letter values × word length).
- **Spelling Bee** (Phase 4): 7-letter set with one mandatory center letter, words must be ≥4 letters and use only the 7 letters; pangram = all 7 used.

## Mini board layout (canonical)

```
   0  1  2  3  4  5  6  7  8  9 10
 0 TW  .  . DL  . DL  .  .  .  . TW
 1  . DW  .  .  . TL  .  .  . DW  .
 2  .  . DL  .  .  .  .  . DL  .  .
 3  .  .  . TL  .  .  . TL  .  . DL
 4  .  .  .  .  .  .  .  .  .  .  .
 5 DL TL  .  .  . ★  .  .  . TL DL
 6  .  .  .  .  .  .  .  .  .  .  .
 7 DL  .  . TL  .  .  . TL  .  .  .
 8  .  . DL  .  .  .  .  . DL  .  .
 9  . DW  .  .  . TL  .  .  . DW  .
10 TW  .  .  .  . DL  . DL  .  . TW
```

★ = (5,5) DW + starting star. Verified by `src/engine/__tests__/mini-board.test.ts`.
