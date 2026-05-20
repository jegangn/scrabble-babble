// Scrabble Babble — shared components
// All screens import via window globals.

const T = window.TOKENS;
const C = T.color, S = T.space, R = T.radius, F = T.font, Z = T.size, W = T.weight, SH = T.shadow, M = T.motion;

// ════════════════════════════════════════════════════════════════
// Surface — wraps a screen artboard with the cream paper + grain.
// ════════════════════════════════════════════════════════════════
function Surface({ width, height, children, padding = S.x8, grain = true, style }) {
  return (
    <div
      style={{
        position: "relative",
        width, height,
        background: C.cream,
        color: C.ink,
        fontFamily: F.sans,
        overflow: "hidden",
        ...style,
      }}
    >
      {grain && (
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: .35,
          backgroundImage: window.GRAIN_BG,
          backgroundSize: window.GRAIN_BG_SIZE,
          backgroundPosition: window.GRAIN_BG_POS,
        }} />
      )}
      <div style={{ position: "absolute", inset: 0, padding, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Scrabble Tile — the workhorse component.
// variant: cream | brown | ghost | blank
// ════════════════════════════════════════════════════════════════
function Tile({ letter, size = 64, variant = "cream", showValue = true, style, placed = false }) {
  const fontPx = Math.round(size * 0.58);
  const ptPx   = Math.max(11, Math.round(size * 0.24));
  const rad    = Math.max(6, Math.round(size * 0.13));
  const val    = letter && letter !== " " ? window.TILE_VALUES[letter.toUpperCase()] : null;

  const bgs = {
    cream:  "linear-gradient(165deg, #F8EBD0 0%, #EBD7AE 65%, #E2C896 100%)",
    brown:  "linear-gradient(165deg, #875632 0%, #6F4423 60%, #5A3818 100%)",
    blank:  "linear-gradient(165deg, #FAF1DC 0%, #EFE0BE 100%)",
    ghost:  "transparent",
  };
  const fg = variant === "brown" ? C.cream : C.ink;
  const shadow = placed
    ? "0 0 0 2px " + C.success + " inset, " + SH.tile
    : variant === "brown" ? SH.tileBrown
    : variant === "ghost" ? "inset 0 0 0 1.5px " + C.brown
    : SH.tile;

  return (
    <div style={{
      position: "relative",
      width: size, height: size,
      borderRadius: rad,
      background: bgs[variant],
      color: variant === "ghost" ? C.brown : fg,
      boxShadow: shadow,
      fontFamily: F.serif,
      fontWeight: W.bold,
      display: "grid", placeItems: "center",
      userSelect: "none",
      flexShrink: 0,
      ...style,
    }}>
      <span style={{ fontSize: fontPx, lineHeight: 1, transform: "translateY(-3%)" }}>
        {letter ?? ""}
      </span>
      {showValue && val != null && (
        <span style={{
          position: "absolute",
          right: "12%", bottom: "8%",
          fontFamily: F.sans, fontWeight: W.med,
          fontSize: ptPx, lineHeight: 1,
          opacity: variant === "brown" ? .9 : .82,
        }}>{val}</span>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Buttons
// kind: primary | secondary | destructive | ghost
// ════════════════════════════════════════════════════════════════
function Button({ kind = "secondary", size = "md", icon, children, full, style, onClick, disabled }) {
  const pad =
    size === "lg" ? "20px 28px" :
    size === "sm" ? "10px 16px" : "14px 22px";
  const fz = size === "lg" ? Z.bodyLg : size === "sm" ? Z.caption : Z.body;
  const minH = size === "lg" ? 64 : size === "sm" ? 44 : 56;

  const palettes = {
    primary: {
      background: `linear-gradient(180deg, color-mix(in oklab, ${C.brown} 92%, white 8%) 0%, ${C.brown} 100%)`,
      color: C.cream,
      border: `1.5px solid ${C.brownDark}`,
      boxShadow: SH.primary,
    },
    secondary: {
      background: C.paper,
      color: C.ink,
      border: `1.5px solid ${C.stroke}`,
      boxShadow: SH.card,
    },
    destructive: {
      background: C.paper,
      color: C.danger,
      border: `1.5px solid ${C.danger}`,
      boxShadow: SH.card,
    },
    ghost: {
      background: "transparent",
      color: C.brown,
      border: `1.5px solid transparent`,
      boxShadow: "none",
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        appearance: "none",
        font: "inherit",
        fontSize: fz, fontWeight: W.med,
        padding: pad,
        minHeight: minH,
        borderRadius: R.card,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: S.x3,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? .45 : 1,
        width: full ? "100%" : undefined,
        transition: `transform ${M.fast}, box-shadow ${M.normal}, background ${M.normal}`,
        letterSpacing: "-0.005em",
        whiteSpace: "nowrap",
        ...palettes[kind],
        ...style,
      }}
    >
      {icon && <span aria-hidden="true" style={{ display: "inline-flex" }}>{icon}</span>}
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// CardRow — the pill-shaped row used in menus + stat lists.
// ════════════════════════════════════════════════════════════════
function CardRow({ icon, title, sub, trailing, primary, selected, onClick, style }) {
  const palette = primary ? {
    background: `linear-gradient(180deg, color-mix(in oklab, ${C.brown} 92%, white 8%) 0%, ${C.brown} 100%)`,
    color: C.cream,
    border: `1.5px solid ${C.brownDark}`,
    boxShadow: SH.primary,
  } : selected ? {
    background: C.paper,
    color: C.ink,
    border: `2px solid ${C.brown}`,
    boxShadow: SH.cardHover,
  } : {
    background: C.paper,
    color: C.ink,
    border: `1.5px solid ${C.stroke}`,
    boxShadow: SH.card,
  };
  return (
    <button onClick={onClick} style={{
      appearance: "none", font: "inherit", textAlign: "left",
      padding: primary ? "20px 22px" : "16px 20px",
      borderRadius: R.card,
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      alignItems: "center", gap: S.x4,
      cursor: "pointer",
      width: "100%",
      minHeight: 64,
      transition: `transform ${M.fast}, box-shadow ${M.normal}, border-color ${M.normal}`,
      ...palette,
      ...style,
    }}>
      {icon ?? <span />}
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontWeight: W.med, fontSize: primary ? Z.bodyLg : Z.body, letterSpacing: "-0.005em" }}>{title}</span>
        {sub && <span style={{
          fontSize: Z.micro + 1,
          color: primary ? `color-mix(in oklab, ${C.cream} 78%, transparent)` : C.inkSoft,
          fontWeight: W.reg,
          letterSpacing: ".02em",
        }}>{sub}</span>}
      </span>
      {trailing ?? <Chev primary={primary} />}
    </button>
  );
}

function Chev({ primary }) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"
         style={{ color: primary ? `color-mix(in oklab, ${C.cream} 75%, transparent)` : `color-mix(in oklab, ${C.brown} 55%, transparent)` }}>
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════
// IconChip — square chip for menu/card icons.
// ════════════════════════════════════════════════════════════════
function IconChip({ children, primary, size = 40 }) {
  return (
    <span aria-hidden="true" style={{
      width: size, height: size,
      display: "grid", placeItems: "center",
      borderRadius: R.chip,
      background: primary ? "rgba(255,255,255,.16)" : `color-mix(in oklab, ${C.brown} 10%, transparent)`,
      color: primary ? C.cream : C.brown,
      fontSize: Math.round(size * 0.4),
      fontWeight: W.med,
      flexShrink: 0,
    }}>{children}</span>
  );
}

// ════════════════════════════════════════════════════════════════
// Section header / fieldset legend
// ════════════════════════════════════════════════════════════════
function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontSize: Z.caption,
      letterSpacing: ".14em",
      textTransform: "uppercase",
      color: C.inkSoft,
      fontWeight: W.med,
      marginBottom: S.x3,
      ...style,
    }}>{children}</div>
  );
}

// ════════════════════════════════════════════════════════════════
// Score chip — small badge for numbers
// ════════════════════════════════════════════════════════════════
function ScoreChip({ value, big, tone = "ink" }) {
  const sz = big ? { fz: Z.h2, pad: "6px 14px" } : { fz: Z.bodyLg, pad: "4px 10px" };
  const palette = tone === "ink"
    ? { background: C.cream, color: C.ink, border: `1px solid ${C.stroke}` }
    : tone === "brown"
    ? { background: C.brown, color: C.cream, border: `1px solid ${C.brownDark}` }
    : tone === "success"
    ? { background: C.successBg, color: C.success, border: `1px solid ${C.success}` }
    : { background: C.paper, color: C.ink, border: `1px solid ${C.stroke}` };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontFamily: F.serif, fontWeight: W.bold,
      fontSize: sz.fz, padding: sz.pad,
      borderRadius: R.chip,
      fontVariantNumeric: "tabular-nums",
      minWidth: big ? 64 : 36,
      ...palette,
    }}>{value}</span>
  );
}

// ════════════════════════════════════════════════════════════════
// Tagline — small uppercase caption used under headings
// ════════════════════════════════════════════════════════════════
function Tagline({ children, style }) {
  return (
    <p style={{
      margin: 0,
      fontSize: Z.caption,
      letterSpacing: ".14em",
      textTransform: "uppercase",
      color: C.inkSoft,
      fontWeight: W.med,
      ...style,
    }}>{children}</p>
  );
}

// ════════════════════════════════════════════════════════════════
// Back pill — fixed top-left ← Home
// ════════════════════════════════════════════════════════════════
function BackPill({ label = "Home", style }) {
  return (
    <button style={{
      appearance: "none", font: "inherit",
      position: "absolute", top: S.x6, left: S.x6, zIndex: 5,
      display: "inline-flex", alignItems: "center", gap: S.x2,
      padding: "10px 16px 10px 12px",
      background: C.paper,
      color: C.ink,
      border: `1.5px solid ${C.stroke}`,
      borderRadius: R.pill,
      fontSize: Z.body, fontWeight: W.med,
      boxShadow: SH.card,
      minHeight: 44,
      cursor: "pointer",
      ...style,
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// User chip — fixed top-right
// ════════════════════════════════════════════════════════════════
function UserChip({ name = "George", style }) {
  return (
    <button style={{
      appearance: "none", font: "inherit",
      position: "absolute", top: S.x6, right: S.x6, zIndex: 5,
      display: "inline-flex", alignItems: "center", gap: S.x2,
      padding: "8px 18px 8px 8px",
      background: C.paper,
      color: C.ink,
      border: `1.5px solid ${C.stroke}`,
      borderRadius: R.pill,
      fontSize: Z.body, fontWeight: W.med,
      boxShadow: SH.card,
      minHeight: 44,
      cursor: "pointer",
      ...style,
    }}>
      <span aria-hidden="true" style={{
        width: 30, height: 30, borderRadius: "50%",
        background: C.brownTint, color: C.brown,
        display: "grid", placeItems: "center",
        fontSize: 14, fontWeight: W.bold, fontFamily: F.serif,
      }}>{name.charAt(0).toUpperCase()}</span>
      {name}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// Footer mark — small "S" tile + version line
// ════════════════════════════════════════════════════════════════
function FooterMark({ version = "v0.4", style }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: S.x2, color: C.inkSoft,
      fontSize: Z.micro, textTransform: "uppercase", letterSpacing: ".06em",
      ...style,
    }}>
      <Tile letter="S" size={18} variant="brown" showValue={false} />
      <span>Scrabble Babble · {version}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Toast — flash message (success / error / info)
// ════════════════════════════════════════════════════════════════
function Toast({ kind = "info", title, sub, style }) {
  const palette =
    kind === "success" ? { bg: C.successBg, fg: C.success, br: C.success } :
    kind === "error"   ? { bg: C.dangerBg,  fg: C.danger,  br: C.danger } :
    kind === "warn"    ? { bg: C.warnBg,    fg: C.brown,   br: C.warn  } :
                         { bg: C.ink,       fg: C.cream,   br: C.ink   };
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: S.x3,
      background: palette.bg, color: palette.fg,
      border: `1.5px solid ${palette.br}`,
      borderRadius: R.pill,
      padding: "12px 22px",
      fontSize: Z.body, fontWeight: W.med,
      boxShadow: SH.toast,
      ...style,
    }}>
      <span aria-hidden="true" style={{
        width: 22, height: 22, borderRadius: "50%",
        background: palette.fg, color: palette.bg,
        display: "grid", placeItems: "center",
        fontSize: 13, fontWeight: W.bold,
      }}>
        {kind === "success" ? "✓" : kind === "error" ? "!" : kind === "warn" ? "!" : "i"}
      </span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
        <span>{title}</span>
        {sub && <span style={{ fontSize: Z.micro + 1, opacity: .8, fontWeight: W.reg }}>{sub}</span>}
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Modal frame — backdrop + centered panel
// ════════════════════════════════════════════════════════════════
function ModalFrame({ width = 520, title, sub, children, footer, danger, style }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 20,
      background: "rgba(40, 22, 8, 0.34)",
      display: "grid", placeItems: "center",
    }}>
      <div style={{
        width,
        background: C.paper,
        borderRadius: R.panel,
        border: `1px solid ${C.strokeSoft}`,
        boxShadow: SH.modal,
        overflow: "hidden",
        ...style,
      }}>
        <div style={{ padding: `${S.x6}px ${S.x8}px ${S.x4}px`, borderBottom: `1px solid ${C.creamDark}` }}>
          <h3 style={{
            margin: 0,
            fontFamily: F.serif,
            fontSize: Z.h3,
            fontWeight: W.bold,
            color: danger ? C.danger : C.ink,
            letterSpacing: "-0.01em",
          }}>{title}</h3>
          {sub && <p style={{ margin: `${S.x2}px 0 0`, fontSize: Z.body, color: C.inkSoft }}>{sub}</p>}
        </div>
        <div style={{ padding: `${S.x6}px ${S.x8}px` }}>
          {children}
        </div>
        {footer && (
          <div style={{
            display: "flex", gap: S.x3, justifyContent: "flex-end",
            padding: `${S.x4}px ${S.x8}px ${S.x6}px`,
            borderTop: `1px solid ${C.creamDark}`,
            background: `color-mix(in oklab, ${C.cream} 50%, ${C.paper})`,
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Dictionary missing alert (slim banner row above menu)
// ════════════════════════════════════════════════════════════════
function DictAlert({ style }) {
  return (
    <div role="alert" style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto",
      alignItems: "center", gap: S.x4,
      padding: `${S.x3}px ${S.x4}px`,
      background: C.warnBg,
      border: `1.5px solid ${C.warn}`,
      borderRadius: R.card,
      color: C.brownDark,
      ...style,
    }}>
      <span aria-hidden="true" style={{
        width: 32, height: 32, borderRadius: R.chip,
        background: C.warn, color: C.paper,
        display: "grid", placeItems: "center",
        fontWeight: W.bold,
      }}>!</span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
        <strong style={{ fontWeight: W.bold }}>Dictionary not loaded</strong>
        <span style={{ fontSize: Z.caption, color: C.inkSoft }}>Word checks are disabled until the wordlist is available.</span>
      </span>
      <button style={{
        appearance: "none", font: "inherit",
        background: "transparent", border: `1.5px solid ${C.warn}`,
        color: C.brownDark, borderRadius: R.pill,
        padding: "8px 14px", fontSize: Z.caption, fontWeight: W.med,
        cursor: "pointer", minHeight: 36,
      }}>Retry</button>
    </div>
  );
}

// Export to window
Object.assign(window, {
  Surface, Tile, Button, CardRow, IconChip, SectionLabel, ScoreChip,
  Tagline, BackPill, UserChip, FooterMark, Toast, ModalFrame, DictAlert,
});
