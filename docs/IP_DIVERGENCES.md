# IP Divergences from Hasbro Scrabble & Zynga WWF

Scrabble Babble is a private family gift; even so, we do not copy proprietary elements.

## Board Layout

- Original 15×15 layout designed in-house with 4-fold rotational symmetry.
- 57 premium cells of 225 total (~25%):
  - 8 TW (Triple Word)
  - 9 DW (Double Word, including center starting star at (7,7))
  - 16 TL (Triple Letter)
  - 24 DL (Double Letter)
- Verified by `src/engine/__tests__/symmetry.test.ts`.
- Layout differs visually and structurally from both Scrabble and WWF.

### Layout reference

```
   0  1  2  3  4  5  6  7  8  9 10 11 12 13 14
 0 TW  .  . DL  .  .  . TW  .  .  . DL  .  . TW
 1  . DL  .  .  . TL  .  .  . TL  .  .  . DL  .
 2  .  . DL  .  .  . TL  . TL  .  .  . DL  .  .
 3 DL  .  . DW  .  .  .  .  .  .  . DW  .  . DL
 4  .  .  .  . DL  .  . DL  .  . DL  .  .  .  .
 5  . TL  .  .  . DW  .  .  . DW  .  .  . TL  .
 6  .  . TL  .  .  .  .  .  .  .  .  . TL  .  .
 7 TW  .  .  . DL  .  .  ★  .  . DL  .  .  . TW
 8  .  . TL  .  .  .  .  .  .  .  .  . TL  .  .
 9  . TL  .  .  . DW  .  .  . DW  .  .  . TL  .
10  .  .  .  . DL  .  . DL  .  . DL  .  .  .  .
11 DL  .  . DW  .  .  .  .  .  .  . DW  .  . DL
12  .  . DL  .  .  . TL  . TL  .  .  . DL  .  .
13  . DL  .  .  . TL  .  .  . TL  .  .  . DL  .
14 TW  .  . DL  .  .  . TW  .  .  . DL  .  . TW
```

★ = (7,7) DW + starting star.

## Tile Distribution

WWF-inspired (letter values differ from Scrabble), 104 tiles total. See `src/engine/config/tiles.ts`.

Key differences from Scrabble:

- 104 tiles vs Scrabble's 100
- E count: 13 vs 12
- M=2 (value 4) vs Scrabble's M=2 (value 3)
- D=5 (value 2) vs Scrabble's D=4 (value 2)
- J/Q/Z value 10, X value 8 (matches WWF, differs from Scrabble's J=8, X=8, Q=10, Z=10)
- 2 blanks at value 0 (same as Scrabble)

## Dictionary

Collins Scrabble Words 2021 (CSW21), ~279,077 words (2–15 letters) — the international tournament lexicon.

**Attribution / licensing notice:** CSW21 is © HarperCollins Publishers Limited, published under licence with Collins. The list is sourced from the community `scrabblewords` project, with definitions stripped so only the bare words ship.

> Word list: Collins Scrabble Words 2021 (CSW21). Source: github.com/scrabblewords/scrabblewords

> ⚠️ **This reverses the project's original dictionary decision.** Scrabble Babble first shipped ENABLE — a public-domain list — specifically to keep the app legally clean. The switch to CSW21 was a deliberate, informed choice by the owner for a larger international word list, accepting that **CSW21 is copyrighted, not public domain.** The board layout and tile values remain original / WWF-inspired and legally distinct from Hasbro Scrabble; only the dictionary's IP status changed.

## Rule Deltas

- Bingo bonus: +35 (vs Scrabble's +50, matches WWF's +35).
- Rack size: 7 (industry standard).
- End-game rack-out: standard (loser's rack value subtracted from loser, added to winner).
- Pass end-condition: game ends when both players have passed twice in a row (4 consecutive passes).
- Swap legality: must have ≥1 tile in bag (more permissive than Scrabble's ≥7).
