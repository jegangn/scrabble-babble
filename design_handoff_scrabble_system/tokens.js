// Scrabble Babble — design tokens (single source of truth)
// Exposed as window.TOKENS so every screen file can grab them.

window.TOKENS = {
  // ─── Color ──────────────────────────────────────────────────────
  color: {
    // Anchor palette (from home screen)
    brown:     "#6F4423",
    brownDark: "#56341A",
    brownMed:  "#8E5E37",
    brownTint: "#E8D6BB",          // brown at ~12% on cream
    cream:     "#F1E5CF",
    creamDark: "#E6D6B7",
    paper:     "#FFFFFF",
    ink:       "#2A1A0C",
    inkSoft:   "#6B5641",
    inkMuted:  "#8E7B62",
    stroke:    "#C9B48E",
    strokeSoft:"#DDC9A2",

    // System accents (used sparingly)
    success:   "#5A7A4B",          // calm moss — win states, valid word
    successBg: "#DEE6CF",          // moss tint for toast bg
    danger:    "#A8443B",          // muted brick — destructive only
    dangerBg:  "#EFD1C9",          // brick tint
    warn:      "#B98033",          // amber — dictionary alerts
    warnBg:    "#F1DDB7",

    // Board premium squares (muted, sit on cream)
    sq: {
      base:   "#EBDBBE",           // empty cell — cream a half-step darker
      tw:     "#A04A3F",           // triple word — terracotta
      twInk:  "#FFFFFF",
      dw:     "#D89B82",           // double word — peach
      dwInk:  "#5A1F12",
      tl:     "#4E7480",           // triple letter — muted teal
      tlInk:  "#FFFFFF",
      dl:     "#B8C9BB",           // double letter — sage
      dlInk:  "#1F3A2A",
      star:   "#6F4423",
    },
  },

  // ─── Typography ─────────────────────────────────────────────────
  font: {
    serif: '"Georgia", "Iowan Old Style", "Apple Garamond", serif',
    sans:  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },

  // Type scale (px). Built for arm's-length iPad reading.
  size: {
    micro: 12,    // footers, tile point values at smallest
    caption: 14,  // all-caps small captions
    body: 17,     // base body
    bodyLg: 19,   // primary button label
    h4: 22,
    h3: 28,
    h2: 36,
    h1: 48,       // screen headings
    display: 64,  // hero / game-end winner
  },

  weight: { reg: 500, med: 600, bold: 700, heavy: 800 },

  // ─── Spacing scale ──────────────────────────────────────────────
  // 4-based, used everywhere — never invent intermediate values.
  space: { x05: 2, x1: 4, x2: 8, x3: 12, x4: 16, x5: 20, x6: 24, x8: 32, x10: 40, x12: 48, x16: 64 },

  // ─── Radii ──────────────────────────────────────────────────────
  radius: {
    tile: 8,     // small tile micro radius
    chip: 10,    // icon chip / score chip
    card: 14,    // standard card row
    panel: 18,   // larger panels and modals
    pill: 999,
  },

  // ─── Shadows ────────────────────────────────────────────────────
  shadow: {
    tile:
      "0 1px 0 rgba(255,255,255,.55) inset, " +
      "0 -2px 0 rgba(120,80,40,.18) inset, " +
      "0 2px 3px rgba(60,30,0,.14)",
    tileBrown:
      "0 1px 0 rgba(255,210,160,.18) inset, " +
      "0 -2px 0 rgba(0,0,0,.20) inset, " +
      "0 2px 3px rgba(60,30,0,.22)",
    card:
      "0 1px 0 rgba(255,255,255,.7) inset, " +
      "0 1px 2px rgba(60,30,0,.06), " +
      "0 8px 22px -12px rgba(60,30,0,.18)",
    cardHover:
      "0 1px 0 rgba(255,255,255,.7) inset, " +
      "0 4px 10px rgba(60,30,0,.10), " +
      "0 18px 36px -16px rgba(60,30,0,.28)",
    primary:
      "0 1px 0 rgba(255,220,180,.18) inset, " +
      "0 -2px 0 rgba(0,0,0,.18) inset, " +
      "0 12px 26px -14px rgba(60,30,0,.55)",
    modal:
      "0 30px 80px -20px rgba(40,20,0,.35), " +
      "0 8px 24px -8px rgba(40,20,0,.18)",
    toast:
      "0 12px 30px -10px rgba(40,20,0,.35)",
  },

  // ─── Motion (cap 300ms) ─────────────────────────────────────────
  motion: {
    fast:   "120ms ease",
    normal: "200ms ease",
    slow:   "280ms ease-out",
  },

  // ─── Layout ─────────────────────────────────────────────────────
  layout: {
    iPad:   { w: 1180, h: 820 },
    phone:  { w: 480,  h: 900 },
    tapMin: 44,    // any button
    tapTile: 64,   // rack tiles
  },
};

// ─── Tile point values — WWF-inspired ────────────────────────────
// J/Q/Z=10, X=8. Bumped from classic Scrabble.
window.TILE_VALUES = {
  A:1, B:4, C:4, D:2, E:1, F:4, G:3, H:3, I:1, J:10, K:5, L:2, M:4,
  N:2, O:1, P:4, Q:10, R:1, S:1, T:1, U:2, V:5, W:4, X:8, Y:3, Z:10,
};

// ─── Paper grain — reusable as CSS background-image string ──────
window.GRAIN_BG =
  "radial-gradient(rgba(110,70,30,.05) 1px, transparent 1px), " +
  "radial-gradient(rgba(110,70,30,.04) 1px, transparent 1px)";
window.GRAIN_BG_SIZE = "7px 7px, 11px 11px";
window.GRAIN_BG_POS  = "0 0, 3px 5px";
