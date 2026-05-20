# Handoff: Scrabble Babble — main menu + favicon

## Overview
A redesigned main menu for the **Scrabble Babble** word-game app, plus a matching browser/home-screen icon. The menu is the first screen the user sees on launch and lets them resume a game, start a new one, jump to game modes (Tumbler, Spelling Bee), and import/export saves.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing the intended look and behavior, not production code to copy directly. The task is to **recreate this design in the Scrabble Babble codebase's existing environment** (React, Vue, SwiftUI, native, etc.) using its established patterns and libraries. If no app environment exists yet, pick the most appropriate framework for the project and implement the design there.

The HTML uses Babel-in-the-browser for fast iteration; in production this should be a normal compiled component.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, tile mechanics, and interaction states are intended to ship as shown. Recreate pixel-perfectly using the codebase's existing libraries and patterns.

---

## Screen: Main Menu

**Purpose:** Launch surface. User picks where to go: continue current game, start a new one, hop into a daily/sprint mode, or move save data in or out.

### Layout
- Centered column, max-width **560px**, horizontal padding **28px** (18px on ≤480px viewports).
- Top padding **56px**, bottom padding **96px**.
- Three vertical sections with **36px** gap: Hero → Menu → Footer.

### Background surface
Default cream `#F1E5CF`. Two optional textures (both fixed, pointer-events:none, opacity 0.35):
- **Paper grain** — two stacked radial-gradient dot patterns (7×7px and 11×11px, offset by 3px/5px), ink at 4–5% alpha.
- **Board grid** — 56×56px linear-gradient cross-hatch in ink at 10% alpha, masked with a radial vignette so the grid fades at edges.

### Hero
- Two stacked rows of Scrabble tiles spelling **SCRABBLE** (cream tiles) above **BABBLE** (brown tiles).
- Tile size **66px**, gap **6px** between tiles, **8px** between the two rows.
- Tiles are aligned flat — **no rotation/jitter**. (Earlier draft tilted them; the user asked for flat.)
- Tagline below, **18px** above:
  - Text: `Words, on your terms.`
  - Font: ui-sans-serif, 14px, weight 500, uppercase, letter-spacing 0.14em, color `#6B5641`.

A **serif** alternative title treatment exists (see Tweaks):
- Two-line stacked: "Scrabble" (brown, upright) + "Babble" (ink, italic).
- Georgia / Iowan Old Style / Apple Garamond, weight 800, `font-size: clamp(48px, 8.5vw, 88px)`, line-height 0.98, letter-spacing -0.02em, centered.

### Menu (six items, vertical stack, 10px gap)

| # | Label | Sublabel | Icon glyph | Tile letter | Primary? |
|---|---|---|---|---|---|
| 1 | Resume game | Pick up where you left off | ▶ | R | yes |
| 2 | New game | — | ✦ | N | no |
| 3 | Tumbler | 60-second sprint | ⧗ | T | no |
| 4 | Spelling Bee | Daily puzzle | ✷ | B | no |
| 5 | Export current game | — | ↑ | E | no |
| 6 | Import game | — | ↓ | I | no |

Three menu visual variants exist (see Tweaks). The default is **cards**.

#### Variant: Cards (default)
- Each row is a button, grid `auto 1fr auto` (icon · body · chevron), align-items center, gap 14px.
- Padding **16px 18px** (primary: **20px 18px**).
- Border-radius **14px**, border **1.5px solid #C9B48E**, background `#FFFFFF`.
- Shadow:
  ```
  0 1px 0 rgba(255,255,255,.7) inset,
  0 1px 2px rgba(60,30,0,.06),
  0 8px 22px -12px rgba(60,30,0,.18)
  ```
- Hover: border `#8E5E37`, translateY(-1px), deeper shadow:
  ```
  0 1px 0 rgba(255,255,255,.7) inset,
  0 4px 10px rgba(60,30,0,.10),
  0 18px 36px -16px rgba(60,30,0,.28)
  ```
- Active: translateY(0).
- Focus-visible: 3px outline `color-mix(in oklab, #6F4423 60%, transparent)`, offset 2px.
- Icon chip: 36×36, border-radius 10px, background `color-mix(in oklab, #6F4423 10%, transparent)`, icon color `#6F4423`, font-size 16px.
- Label: 17px, weight 600, color `#2A1A0C`, letter-spacing -0.005em.
- Sublabel: 12.5px, weight 500, color `#6B5641`, letter-spacing 0.02em.
- Chevron: 16px stroke-1.8 right-arrow SVG, color `color-mix(in oklab, #6F4423 55%, transparent)`. On hover: translateX(2px), full brown.

#### Variant: Tiles
Same as Cards but the icon chip is replaced with a real **42px Scrabble tile** showing the row's letter (column "Tile letter" above). On the primary row the tile is cream-on-brown row → uses the cream tile style; on secondary rows the tile is brown.

#### Variant: Minimal
- No border, no shadow, no background, no radius.
- 1px bottom divider in `color-mix(in oklab, #6F4423 20%, transparent)`.
- Padding 18px 4px.
- Hover: faint brown tint background `color-mix(in oklab, #6F4423 6%, transparent)`, divider darkens.
- Primary row keeps the filled brown card treatment to anchor the menu.

#### Primary row (Resume game)
- Filled brown gradient:
  ```
  linear-gradient(180deg,
    color-mix(in oklab, #6F4423 92%, white 8%) 0%,
    #6F4423 100%)
  ```
- Border `#56341A`, label color `#F1E5CF`, label font-size 19px.
- Shadow includes a top highlight and a bottom dark bevel:
  ```
  0 1px 0 rgba(255,220,180,.18) inset,
  0 -2px 0 rgba(0,0,0,.18) inset,
  0 12px 26px -14px rgba(60,30,0,.55)
  ```
- Hover lightens the top stop and darkens the bottom slightly.
- Icon chip on primary: `rgba(255,255,255,.16)` bg, cream icon.
- Sublabel on primary: `color-mix(in oklab, #F1E5CF 78%, transparent)`.

### Scrabble tile component
Reused in the hero and (in the Tiles variant) as the menu icon.

- Shape: rounded square, border-radius = `max(6, round(size * 0.13))`.
- Font: Georgia / Iowan Old Style / Apple Garamond serif, weight 700.
- Letter: font-size = `round(size * 0.58)`, line-height 1, vertically nudged `translateY(-3%)`.
- Point value (lower-right): font-size = `max(9, round(size * 0.22))`, ui-sans-serif, weight 600, opacity 0.82, positioned `right: 12%; bottom: 8%`.
- Two variants:
  - **Cream** (default Scrabble tile):
    - Background: `linear-gradient(165deg, #F8EBD0 0%, #EBD7AE 65%, #E2C896 100%)`
    - Color: `#2A1A0C`
    - Shadow: `0 1px 0 rgba(255,255,255,.55) inset, 0 -2px 0 rgba(120,80,40,.18) inset, 0 2px 3px rgba(60,30,0,.14)`
  - **Brown** (inverted):
    - Background: `linear-gradient(165deg, #875632 0%, #6F4423 60%, #5A3818 100%)`
    - Color: `#F1E5CF`
    - Shadow: `0 1px 0 rgba(255,210,160,.18) inset, 0 -2px 0 rgba(0,0,0,.20) inset, 0 2px 3px rgba(60,30,0,.22)`

Point values follow standard English Scrabble: A1 B3 C3 D2 E1 F4 G2 H4 I1 J8 K5 L1 M3 N1 O1 P3 Q10 R1 S1 T1 U1 V4 W4 X8 Y4 Z10.

### Footer
- Centered horizontal row, 10px gap, 8px top margin.
- Small 18px brown tile showing "S" (no point value), followed by the text `SCRABBLE BABBLE · V0.4`.
- Font: 12px, weight inherited, color `#6B5641`, uppercase, letter-spacing 0.06em.

---

## Interactions & Behavior

### Click handlers (to be wired in target app)
| Item | Action |
|---|---|
| Resume game | Navigate to in-progress game (or disable if none). |
| New game | Open new-game setup (player count, dictionary, time limit). |
| Tumbler | Start 60-second word-finding sprint. |
| Spelling Bee | Open today's daily puzzle. |
| Export current game | Trigger save-state download / share sheet. |
| Import game | Open file picker for save state. |

### Toast (current placeholder)
A pill toast appears bottom-center on any menu press, showing the label, then fades out (1.5s total: 0–15% fade in, 15–85% hold, 85–100% fade out + translateY -6px). Background `#2A1A0C`, color `#F1E5CF`, 13px weight 500, padding 10px 16px, border-radius 999px, shadow `0 8px 30px rgba(0,0,0,.25)`. Replace with real navigation.

### Transitions
- Menu item transform / shadow: `transform .12s ease, box-shadow .2s ease, background .2s ease, border-color .2s ease`.
- Chevron translate: `transform .15s ease`.

### Responsive
Single breakpoint at `max-width: 480px`: shell padding drops to `36px 18px 80px`. Everything else fluid via the 560px max-width column.

### Accessibility
- Each row is a real `<button>`.
- Visible focus ring (see Cards spec).
- Icon glyphs / chevron marked `aria-hidden`.
- Title-tile block carries `aria-label="Scrabble Babble"` so screen readers don't read out individual letters.
- Tap targets ≥ 56px tall (primary 64px+).

---

## State Management
Local state needed by this screen:
- `hasResumableGame: boolean` — drives visibility / enabled state of "Resume game".
- `dailyPuzzleAvailable: boolean` — could badge "Spelling Bee" with a dot when today's puzzle is unsolved.
- `currentVersion: string` — footer.

No async fetching is required for the menu itself.

---

## Design Tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| `--brown` | `#6F4423` | Primary ink, brown tile mid-stop, button fill |
| `--brown-d` | `#56341A` | Borders / bevels on brown surfaces |
| `--brown-l` | `#8E5E37` | Hover border on cards |
| `--cream` | `#F1E5CF` | Page background, brown-tile text |
| `--cream-d` | `#E6D6B7` | (Reserved) |
| `--paper` | `#FFFFFF` | Card background |
| `--ink` | `#2A1A0C` | Body text |
| `--ink-soft` | `#6B5641` | Secondary text, sublabels, footer |
| `--stroke` | `#C9B48E` | Card border |
| `--stroke-soft` | `#DDC9A2` | (Reserved) |

Cream-tile gradient stops: `#F8EBD0` → `#EBD7AE` → `#E2C896`.
Brown-tile gradient stops: `#875632` → `#6F4423` → `#5A3818`.

### Spacing
Section gap 36px · menu gap 10px · card padding 16/18px · primary card padding 20/18px · hero internal gap 18px · tile-row gap 6px · grid breakpoint 480px.

### Typography
- **Serif (titles, tile letters):** Georgia, "Iowan Old Style", "Apple Garamond", serif. Weights 700–800.
- **Sans (UI, sublabels, tile point-values):** ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto. Weights 500–600.
- Sizes used: 12 / 12.5 / 13 / 14 / 17 / 19 px in UI; tile letters scale to 0.58× tile size.

### Radii
6, 10, 14, 18, 999 (pill).

### Shadows
See `--shadow-tile`, `--shadow-card`, `--shadow-card-h` in `styles.css`, plus the primary-button shadow stack above.

---

## Favicon + home-screen icon

The icon is a Scrabble tile rendered as an SVG data URI — no PNG assets needed. Three head tags:

```html
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg ... %3C/svg%3E" />
<link rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg ... %3C/svg%3E" />
<meta name="apple-mobile-web-app-title" content="Scrabble" />
```

The SVG (100×100 viewBox): rounded `<rect>` (rx 18, fill `#6F4423`), inset darker stroke at 18% black opacity to imply a tile edge, centered Georgia 64px bold `S` in `#F3E9D9`, with a small 22px sans `1` at (78, 84) at 85% alpha. The `apple-touch-icon` variant omits the inset stroke (it looks cleaner at small home-screen sizes).

See `Scrabble Babble.html` `<head>` for the exact tags, including the `theme-color` meta (`#F1E5CF`).

When porting to a real app:
- iOS/Android wrappers: also generate 180×180 and 512×512 PNG versions from the same SVG and add `<link rel="apple-touch-icon" sizes="180x180" ...>` and `manifest.json` entries.
- Add `manifest.json` with `name`, `short_name: "Scrabble"`, `background_color: "#F1E5CF"`, `theme_color: "#F1E5CF"`, `display: "standalone"`.

---

## Assets
No external images, fonts, or icon sets are used. Everything is CSS gradients, system serifs, and Unicode/SVG glyphs. The Babel CDN in the prototype is purely for in-browser dev — drop it in the production build.

---

## Files in this bundle
- `Scrabble Babble.html` — page shell, head tags, favicon data URIs.
- `app.jsx` — React components: `Tile`, `TileWord`, `Title`, `MenuItem`, `App`, plus the menu data array and tile point-value table.
- `styles.css` — All styling tokens, tile gradients, card / minimal / primary button styles, background textures, toast, responsive rules.
- `tweaks-panel.jsx` — Dev-only tweak panel (Tweaks variants for title style, menu variant, background texture, sublabel toggle, palette). Not needed in production — strip on port.

## Tweakable parameters captured (for product decisions)
These were exposed as live tweaks so the team can pick before shipping:
- **Title treatment:** `tiles` (default) or `serif`.
- **Menu style:** `cards` (default), `tiles`, or `minimal`.
- **Background:** `plain`, `grain` (default), or `board`.
- **Sublabels:** on by default; can be hidden for a tighter list.
- **Ink color:** `#6F4423` (default), `#3A2410`, `#1F4D3A`, `#7A2E2E`.
- **Paper color:** `#F1E5CF` (default), `#F4ECDA`, `#EDE3CB`, `#E8DCC0`.
