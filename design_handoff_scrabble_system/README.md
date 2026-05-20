# Handoff: Scrabble Babble — full UI system

## Overview
A complete UI system for the **Scrabble Babble** iPad-landscape PWA — the same designer continuing from the home screen we built. Nine screens, four modals, and two phone-portrait reflows, all sharing one set of tokens and one set of components. The visual anchor (cream paper, brown tile typography, warm soft shadows) is preserved across every surface.

## About the design files
The files in this bundle are **design references created in HTML** — a high-fidelity prototype showing intended look, structure, and behaviour. They are **not production code to copy directly**. The task is to **recreate this design in the Scrabble Babble codebase's environment** (React Native / SwiftUI / web React / whatever ships) using the codebase's established patterns and libraries. Treat the JSX here as a faithful spec, not as the implementation.

The HTML uses in-browser Babel for fast iteration; that gets compiled away in production.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, tile mechanics, premium-square palette, modal patterns, and interaction states are intended to ship as shown. The two phone-portrait variants are layout direction (how to reflow), not final visual spec — the iPad-landscape mocks are the primary target.

## Design rationale — what makes this *not* generic AI aesthetic
A short list of regressions to watch for in future revisions:

1. **No gradient slop.** Backgrounds are flat cream with a real-paper dot grain. The only gradients are *on tiles*, where they imply a physical bevel (165° linear, three stops) and on the primary brown button (a 2-stop top-highlight). Everything else is flat.
2. **No glassmorphism.** Cards are opaque white with a real warm shadow (`0 8px 22px -12px rgba(60,30,0,.18)`). No `backdrop-filter` anywhere except the optional name-prompt modal blur.
3. **No emoji icons.** Icon chips use either real SVG or geometric Unicode glyphs (★ ⇅ ⇌ ↑ ↓ ↺ ⌫ ▶ ✦ ⧗ ✷). The tile letters themselves do most of the "icon" work.
4. **Serif headings, sans body.** Georgia (or Iowan Old Style) for tile letters, big numbers, score chips, and screen H1s. ui-sans-serif for everything else. Inter is explicitly avoided.
5. **No saturated accent colors.** Success = moss `#5A7A4B`, danger = muted brick `#A8443B`, warn = amber `#B98033`. No teal `#0ea5e9`, no purple `#7c3aed`, no neon green.
6. **No outlined-card-with-left-accent-border** pattern. Cards are full-bleed white on cream with a 1.5px stroke.
7. **Premium board squares are muted.** Terracotta / peach / muted teal / sage instead of vivid red / pink / royal blue / sky. They sit *on* the cream world instead of fighting it.
8. **Type values stay readable.** The point-value subscript on every tile is sized at `0.24× tile size` minimum 11px — not the shrunken afterthought most Scrabble clones do.
9. **No win-celebration effects.** Game-end shows a calm "Margaret wins." in serif with one moss-coloured tagline. No confetti, no fireworks, no animated trophy.
10. **Large tap targets, calmly arranged.** Rack tiles 64–72px on iPad. Buttons minimum 44px. Action bar spaces buttons with `gap: 12px`, not crammed.

---

## The design system

### Color tokens
| Token | Hex | Use |
|---|---|---|
| `brown` | `#6F4423` | Primary ink, brown tile, primary button, board border |
| `brownDark` | `#56341A` | Borders / bevels on brown surfaces |
| `brownMed` | `#8E5E37` | Hover stroke, secondary brown |
| `brownTint` | `#E8D6BB` | Avatar fills, soft chip background |
| `cream` | `#F1E5CF` | Page background |
| `creamDark` | `#E6D6B7` | Segmented-control track, dashed-divider |
| `paper` | `#FFFFFF` | Card / modal surface |
| `ink` | `#2A1A0C` | Body text |
| `inkSoft` | `#6B5641` | Secondary text, sublabels, taglines |
| `inkMuted` | `#8E7B62` | Disabled / progress-bar fill (less prominent) |
| `stroke` | `#C9B48E` | Card border |
| `strokeSoft` | `#DDC9A2` | Reserved — inner dividers |
| `success` | `#5A7A4B` | Calm moss — wins, valid words, active-player dot |
| `successBg` | `#DEE6CF` | Moss tint backgrounds |
| `danger` | `#A8443B` | Destructive actions only |
| `dangerBg` | `#EFD1C9` | Destructive callout backgrounds |
| `warn` | `#B98033` | Dictionary alerts |
| `warnBg` | `#F1DDB7` | Warn callout backgrounds |

### Board premium-square palette (muted)
| Square | Background | Text |
|---|---|---|
| TW (Triple Word) | `#A04A3F` terracotta | `#FFFFFF` |
| DW (Double Word) | `#D89B82` peach | `#5A1F12` |
| TL (Triple Letter) | `#4E7480` muted teal | `#FFFFFF` |
| DL (Double Letter) | `#B8C9BB` sage | `#1F3A2A` |
| Plain cell | `#EBDBBE` cream-step | `#6B5641` |
| Centre star | `#6F4423` brown | `#F1E5CF` cream ★ |

### Tile gradients
- **Cream tile:** `linear-gradient(165deg, #F8EBD0 0%, #EBD7AE 65%, #E2C896 100%)` + 3-layer shadow (inset top highlight, inset bottom bevel, drop)
- **Brown tile:** `linear-gradient(165deg, #875632 0%, #6F4423 60%, #5A3818 100%)`
- **Placed-but-uncommitted tile:** cream tile with `0 0 0 2px #5A7A4B inset` ring (moss)

### Tile point values (WWF-inspired)
J/Q/Z = 10, X = 8, V = 5, K = 5, B/C/F/M/P/W = 4, G/H/Y = 3, D/N/U = 2, A/E/I/L/O/R/S/T = 1.

Full table in `tokens.js` as `window.TILE_VALUES`.

### Type
- **Serif** (tile letters, big numbers, score chips, headings): `"Georgia", "Iowan Old Style", "Apple Garamond", serif`. Weights 700–800.
- **Sans** (UI, sublabels, captions, point-value subscripts): `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Weights 500–600.
- **Scale (px):** 12 (micro), 14 (caption), 17 (body), 19 (body-lg), 22 (h4), 28 (h3), 36 (h2), 48 (h1), 64 (display).
- All-caps "tagline" pattern: 14px, weight 500, uppercase, letter-spacing 0.14em, color `inkSoft`.
- Score numbers always `font-variant-numeric: tabular-nums`.

### Spacing scale
4-based: 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px. Reach for these tokens (`tokens.space.x1`–`x16`); don't invent in-between values.

### Radii
| Token | px | Use |
|---|---|---|
| `tile` | 8 | Tile micro radius (only used inside the tile component) |
| `chip` | 10 | Icon chip, score chip |
| `card` | 14 | Card rows, buttons, segmented-control items |
| `panel` | 18 | Modal panels, large board container |
| `pill` | 999 | Pills (Home back, user chip, toast) |

### Shadows (named, never one-off)
- `tile` — inset highlight + inset bevel + soft drop. Default tile.
- `tileBrown` — same with warmer/darker stops. Brown tiles.
- `card` — standard card resting state.
- `cardHover` — card lifted: stronger drop, no border colour change.
- `primary` — bevelled brown button: inset top highlight + inset bottom bevel + warm drop.
- `modal` — deep ambient drop for modal panels.
- `toast` — tighter drop for floating toasts.

### Motion
| Token | Duration | Curve |
|---|---|---|
| `fast` | 120ms | ease |
| `normal` | 200ms | ease |
| `slow` | 280ms | ease-out |

No animation exceeds 300ms. Win states use a single fade-in of the moss-coloured tagline; no celebratory effects.

### Layout
- iPad landscape: **1180 × 820** (primary target).
- Phone portrait fallback: **480 × 900** (designed for two screens, documented for all).
- Minimum tap targets: **44px** for any button, **64px** for rack tiles, **44px+** for the back pill and user chip.

---

## Shared components

All exported on `window` for cross-file consumption. See `components.jsx`.

| Component | Purpose |
|---|---|
| `Surface` | Wraps a screen artboard: cream paper background + optional dot grain. |
| `Tile` | Scrabble tile. Variants: `cream`, `brown`, `ghost` (outlined), `blank`. Auto-renders point value subscript. `placed` prop adds moss ring for pending placements. |
| `Button` | Kinds: `primary` (brown gradient), `secondary` (white card), `destructive` (red outline + text), `ghost`. Sizes: `sm` (44 min-height), `md` (56), `lg` (64). |
| `CardRow` | Pill-shaped menu/stat row — icon · title · sub · chevron. Used in menus AND stat lists. Primary variant for hero CTA. |
| `IconChip` | Square icon chip used inside `CardRow`. |
| `SectionLabel` | All-caps uppercase section header. Letter-spaced 0.14em. |
| `ScoreChip` | Number badge. Sizes `big` / regular. Tones: `ink`, `brown`, `success`. Always tabular-nums. |
| `Tagline` | Small uppercase caption (used above headings). |
| `BackPill` | Top-left ← Home pill (44px minimum). Fixed position. |
| `UserChip` | Top-right user pill with avatar circle. Fixed position. |
| `FooterMark` | Small "S" tile + version line for the bottom of resting screens. |
| `Toast` | Flash notification. Kinds: `success`, `error`, `warn`, `info`. Status circle + title + optional sub. |
| `ModalFrame` | Backdrop + centered panel. Title, optional sub, body slot, optional footer slot. Optional `danger` flag changes title color. |
| `DictAlert` | Slim banner row used above home menu when the wordlist failed to load. |
| `Board` | Renders a 15×15 or 11×11 board from a string-array layout. Accepts `placements` dict keyed by `"r,c"`. |
| `Rack` | Tile rack — generous 12px gap, brown felt background, supports `selected` indices (lifted with moss underline). |
| `PlayerCard` | In-game scoreboard row. Active player gets brown border, active dot, and brown score chip. |
| `ActionBar` | Shuffle / Swap / Pass / Resign + Recall + Submit row. Auto-disables Submit when no placements. |
| `TilesLeft` | Pill chip showing bag count. |
| `BeePill` | Round Spelling Bee letter pill — center (brown) or outer (cream) variants. |
| `BeeHex` | 7-tile hex arrangement with trail-polyline overlay support. |
| `CurrentWord` | Display strip for the in-progress word (tiles or dashed empty state). |
| `FoundList` | Card listing found words, configurable column count. |
| `BigNumber` | Large numeric panel (used for Tumbler timer / score). Tones: `ink`, `brown`, `success`, `warn`. |

---

## Screen-by-screen layout notes

(See `screen-*.jsx` files for the exact spec. iPad landscape 1180 × 820 unless noted.)

### 1. New Game (`screen-gameflow.jsx → NewGameScreen`)
Two-column layout. Left: header → players (NameInput rows) → opponent (`Segmented`) → difficulty (5 button card row). Right: board picker (3 cards with miniature board thumbnails) → primary "Start game" button anchored to bottom.

- **Difficulty row is conditionally rendered** only when opponent = Computer. Five options with star ratings: Friendly · Easygoing · Steady · Sharp · Master.
- Board picker shows 3×3 simplified previews — TW corners, central star, premium hints.
- "Mini" board is shown as the selected option in this mock.

### 2. In-game · Classic 15×15 (`screen-ingame.jsx → InGameClassicScreen`)
Board on the left (~600px square), sidebar on the right. Bottom strip: tile rack + action bar.

- Board layout in `CLASSIC_BOARD` const — 4-fold symmetric, exact premium counts: **8 TW / 9 DW (incl. center) / 16 TL / 24 DL**. Standard for the user's codebase.
- Sidebar order: match-info row (board name + tiles-left) → two `PlayerCard`s → last-move chip → pending-word preview (moss-toned, shows the word being composed + projected score).
- Rack uses 72px tiles. Placed-but-uncommitted tiles on the board get a 2px moss ring.
- Action bar: Shuffle / Swap / Pass / Resign (secondary) on the left; Recall / **Submit · 2 tiles** (primary) on the right. Recall only renders when `placedCount > 0`.

### 3. In-game · Mini 11×11 (`InGameMiniScreen`)
Same shape, smaller board (~520px). Sidebar adapts: shows "Computer is thinking" indicator + a small contextual tip card ("Smaller board, bigger swings"). Rack is dimmed at 55% opacity to indicate the waiting state. Layout in `MINI_BOARD` const.

### 4. Hot-seat handoff (`HandoffScreen`)
Centred modal-like overlay on a cream→creamDark vertical gradient (no game board visible behind — the previous player shouldn't see it).

- Row of cream tiles spelling the player's first name (truncated to 8 chars).
- "Pass the iPad to Margaret" in serif h1.
- Two buttons: Cancel turn (ghost) + "I'm Margaret — ready" (primary).
- A single button is the spec's requirement; the cancel is the safety net.

### 5. Game End (`GameEndScreen`)
Two-column. Left: winner header + tagline + tagline copy + two `FinalScoreRow` cards + bottom-anchored "Review board" + "Play again" actions. Right: stats card (Total moves, Top move, Board, Mode, Duration, Bingos played) with a moss "Saved to your history" confirmation chip.

### 6. Tumbler — live (`TumblerScreen`)
Two-column. Left: header with `BigNumber` timer (warn-tone, ticking down) and `BigNumber` score (brown-tone) → `CurrentWord` strip → success Toast example ("QUARTZ · +24 · Bingo bonus") → rack (84px tiles, larger because tumbler is rack-first) → button row (Shuffle / Clear / Submit). Right: `FoundList` of found words this round + personal-best card.

### 7. Tumbler — end (`TumblerEndScreen`)
Two-column. Left: tagline + giant numeric score + delta from prev best + `CompareBar` (two horizontal bars, prev = inkMuted, this = success). Right: `FoundList` grid of all words found. Bottom actions: Restart (secondary) + Play again (primary).

### 8. Spelling Bee (`SpellingBeeScreen`)
Two-column. Left: header + `CurrentWord` strip + `BeeHex` arrangement (1 center + 6 outer, 360×360 container with dashed ring guide; trail polyline drawn on `<svg>` overlay) + action row (Delete / Shuffle / Submit). Right: rank progress bar + found-list grid.

- **Hex sizing:** outer pills at radius 100px from center, 110px diameter each. Container 360×360 leaves generous space for finger-slide trails without overlapping the action row.
- **Trail rendering:** SVG `<polyline>` with `strokeWidth=6`, stroke `success` colour, plus a soft halo `<circle r=14 opacity=.18>` at each touched node. Live behavior: append to points array on each pointermove; clear on pointerup if word invalid.

### 9. Modals — overlay style (`screen-modals.jsx`)
All modals share `ModalFrame`: dim brown backdrop (`rgba(40, 22, 8, 0.34)`), centered white panel (radius 18, modal-shadow), title in serif h3 + optional sub paragraph + body slot + optional footer slot with right-aligned buttons.

- **Blank picker (`BlankPickerScreen`):** 7×4 grid of letter buttons (26 letters + 2 dashed filler cells: "Surprise", "Reset"). Tiles render as cream Scrabble tiles. Title: "Pick a letter for your blank."
- **Swap picker (`SwapPickerScreen`):** Rack rendered inside a brown felt strip; tapping a tile flips it to a ghost (outlined) tile with a moss check-circle. Warn callout: "Only 7 tiles left in the bag…" Footer: Cancel (ghost) + "Swap N tiles" (primary).
- **Resign confirm (`ResignConfirmScreen`):** Danger-styled title. Danger-bg callout with "This can't be undone." Footer: "Keep playing" (ghost) + "End game now" (destructive — red outline + red text).
- **Name prompt (`NamePromptScreen`):** Single text input with focus ring (4px moss-brown halo), avatar preview circle. Footer: Cancel + Save.

### Mobile portrait (480×900) reflows — `screen-modals.jsx` bottom half
- **`InGameClassicMobile`:** Compact two-column player chips at top, board centered (440px), tiles-left + last-move below, rack + action bar in a sticky bottom strip. Action bar uses `sm` buttons (Shuffle / Swap / Pass + Submit).
- **`SpellingBeeMobile`:** Vertical stack — header, `CurrentWord`, `BeeHex`, action row, then a slim rank bar pinned to bottom. Found-list is dropped from the portrait variant (accessed by scroll or a separate sheet).

Other screens reflow with the same pattern: right-column sidebars become bottom sheets; the board scales to viewport width; action bars stay sticky-bottom.

---

## Interactions & behaviour

### Click handlers (wire in target app)
| Surface | Action |
|---|---|
| New game · Start | Persist setup → navigate to in-game. |
| New game · opponent toggle | Toggles Computer/Hot-seat. Difficulty section shows only when Computer. |
| In-game · tile in rack | Tap to select; tap a board cell to place. Drag also supported (mouse / touch). |
| In-game · board placed tile (uncommitted) | Tap to return to rack. |
| In-game · Submit | Validate word against dictionary; on success, animate score increment (200ms ease), refill rack, advance turn, push handoff screen if hot-seat. |
| In-game · Submit invalid | Flash error Toast ("Not in dictionary") at top center; placed tiles remain on board. |
| In-game · Recall | Returns all uncommitted tiles to rack instantly. |
| In-game · Swap | Open Swap modal. |
| In-game · Resign | Open Resign-confirm modal. |
| Tumbler · rack tap | Append letter to current word; lift the tile +6px with moss underline. |
| Tumbler · Submit | If valid: success toast (+score), add to found list, refill any used tiles, clear current word. If invalid: error toast, leave word for editing. |
| Bee · letter tap | Append letter to current word. Same behaviour for slide composition — onPointerDown starts a path, onPointerMove samples letters under the cursor, onPointerUp submits the assembled word. |
| Bee · slide trail | Live `<polyline>`; clear when finger lifts. Visited-node halo persists 120ms then fades. |
| Modal backdrops | Tap to dismiss only on safe modals (blank picker, swap, name). Resign-confirm requires explicit button. |

### Transitions (cap 300ms)
- Card row hover: `transform .12s ease, box-shadow .2s ease, border-color .2s ease`.
- Tile lift on rack: `transform .12s ease` (no overshoot).
- Toast fade: 200ms in, 200ms out, hold 1.5s.
- Submit success scoreboard increment: 200ms tabular number tween.
- No spring physics, no oscillating bounces.

### Active player indicator
- Active `PlayerCard`: 2px brown border + brown score chip + moss dot bottom-right of avatar + "Your turn" caption in success colour.
- Inactive: 1.5px stroke border, paper-cream background, ink-soft "Waiting" caption.

### Loading / waiting
- Computer thinking: three small brown dots in a row, increasing opacity. No spinner.
- Dictionary load: `DictAlert` slim banner above the home menu (shipped in components, not on this canvas — it's home-screen scope).

### Error states
- Invalid word: red Toast at top center.
- Network/save failure: warn Toast.
- Resign mid-game: destructive button gate (modal).

### Form validation
- Player names: 2–16 characters, trimmed.
- New game: Start disabled until both players have non-empty names.

### Responsive behaviour
- iPad 1180×820 — primary, all screens.
- Tab S8 1280×800 — same layout; board scales up to ~640px max.
- Phone 480×900 — sidebar collapses below board; rack stays bottom-sticky; modals occupy 92vw with rounded corners; rack tiles drop to 52px (still ≥ tap-min thanks to the brown felt's padding making the rack interactive zone larger).

---

## State management
Per-screen state shapes (suggestive, not prescriptive):

- **NewGame:** `{ players: [{name}, {name}], opponent: 'hotseat'|'cpu', board: 'classic'|'random'|'mini', difficulty: 1..5 }`
- **InGame:** `{ board: 15|11, cells: Map<"r,c", {letter, by: 'p1'|'p2'|'pending', isBlank?}>, rack: Letter[], scores: [n, n], turn: 0|1, tilesLeft: n, lastMove: {word, score, by}, pending: {letter, r, c}[] }`
- **Tumbler:** `{ timeLeft: ms, score: n, current: Letter[], rack: Letter[], found: string[], best: n }`
- **SpellingBee:** `{ date, center: Letter, outer: Letter[], required: Letter, current: Letter[], found: string[], rank: string, nextRank: n, score: n, totalScore: n }`

Persist `best` (Tumbler) and per-day Bee state to local storage. Resume-game state on home screen reads from in-game persistence.

---

## Assets
**None external.** Every glyph is either a real SVG path inline (chevron, refresh, arrow), a Unicode geometric character (★ ⇅ ⇌ ↑ ↓ ↺ ⌫ ▶ ✦ ⧗ ✷ ! ✓), or rendered text. The favicon is a data-URI SVG (see home-screen handoff).

No external fonts. No icon library. No images.

---

## Files in this bundle
- `Scrabble Babble — system.html` — root HTML, loads everything in order.
- `tokens.js` — single source of truth for colors, type, space, radii, shadows, motion, tile values. Plain JS, sets `window.TOKENS`.
- `components.jsx` — every shared component (see table above).
- `screen-gameflow.jsx` — `NewGameScreen`, `HandoffScreen`, `GameEndScreen`.
- `screen-ingame.jsx` — `InGameClassicScreen`, `InGameMiniScreen`, `Board`, `PlayerCard`, `Rack`, `ActionBar`, `TilesLeft`, board layout constants.
- `screen-modes.jsx` — `TumblerScreen`, `TumblerEndScreen`, `SpellingBeeScreen`, plus `BigNumber`, `CurrentWord`, `FoundList`, `BeePill`, `BeeHex`.
- `screen-modals.jsx` — four modal screens + two mobile-portrait variants.
- `canvas.jsx` — design-canvas host, lays out every artboard for review (dev-only, drop in production).
- `design-canvas.jsx` — pan/zoom canvas component (dev-only).

## Porting checklist
1. Lift `tokens.js` straight into your codebase as a typed constants module.
2. Port `Tile`, `Button`, `CardRow`, `ModalFrame` first — every screen depends on them.
3. Port the `Board` renderer; verify your real board-layout data lines up with the premium-square colour palette.
4. Wire one screen end-to-end (suggest: New Game) to validate the token mapping, then proceed in order: In-game → Handoff → Game End → Tumbler → Bee → modals.
5. The dev-only `design-canvas.jsx` and `canvas.jsx` can be deleted on the way out.

## Smell-test rules for future revisions
A token (color, radius, spacing) that appears in only one screen is a smell. Either promote it to `tokens.js` and use it elsewhere, or drop it. Same for one-off animations, one-off shadows, and one-off icon glyphs.
