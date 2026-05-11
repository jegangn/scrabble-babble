# Variants

| Variant | Board | Bag | Dictionary | Opponent | Phase |
|---|---|---|---|---|---|
| Classic | 15×15 fixed layout | 104 | ENABLE | Hot-seat or AI | 1, 2 |
| Random | 15×15 randomized symmetric layout | 104 | ENABLE | Hot-seat or AI | 3 |
| Mini | 11×11 scaled layout | ~60 | ENABLE | Hot-seat or AI | 3 |
| Tumbler | n/a — 7 letters, 60s, free-form | n/a | ENABLE | Solo, personal best | 4 |
| Spelling Bee | 7-letter hex, center mandatory | n/a | ENABLE | Solo, daily seeded | 4 |

## Module Reuse

- Classic, Random, and Mini share the full board engine (`board.ts`, `validator.ts`, `scorer.ts`, `game.ts`) with different `BoardConfig` (size, premium grid) and different `TileDistribution` (Mini gets a scaled bag).
- Tumbler and Spelling Bee are independent modules that only consume `dictionary.ts`. They do not use the board, validator, or scorer.
- All variants share `src/engine/dictionary.ts` and the same ENABLE trie.

## Variant-specific deltas (preview)

- **Random**: at game start, randomize premium-cell positions while preserving the 4-fold symmetry and the (8 TW / 9 DW / 16 TL / 24 DL) counts.
- **Mini 11×11**: smaller board for ~30-min games. Premium counts scale to roughly (4 TW / 5 DW / 8 TL / 12 DL); exact figures finalized in Phase 3.
- **Tumbler**: pull 7 random tiles, 60-second timer, score by sum of (letter values × word length).
- **Spelling Bee**: 7-letter set with one mandatory center letter, words must be ≥4 letters and use only the 7 letters; pangram = all 7 used.
