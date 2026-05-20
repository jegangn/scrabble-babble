// Scrabble Babble — in-game screens (Classic + Mini)

const _T2 = window.TOKENS;
const _C2 = _T2.color, _S2 = _T2.space, _R2 = _T2.radius, _F2 = _T2.font, _Z2 = _T2.size, _W2 = _T2.weight, _SH2 = _T2.shadow, _M2 = _T2.motion;

// 15×15 board layout. T=TW, D=DW, t=TL, d=DL, *=center, .=plain
// 4-fold symmetric. Counts: 8 TW, 9 DW (incl center), 16 TL, 24 DL.
const CLASSIC_BOARD = [
  "T..d...T...d..T",
  ".....t...t.....",
  "..d...d.d...d..",
  "d..t...t...t..d",
  "....D.....D....",
  ".t...D...D...t.",
  "..d...d.d...d..",
  "T..t...*...t..T",
  "..d...d.d...d..",
  ".t...D...D...t.",
  "....D.....D....",
  "d..t...t...t..d",
  "..d...d.d...d..",
  ".....t...t.....",
  "T..d...T...d..T",
];

// 11×11 mini board — symmetric premium pattern.
const MINI_BOARD = [
  "T..d.t.d..T",
  ".D...t...D.",
  "..d.....d..",
  "d..D...D..d",
  ".t.....t..",
  "....*.....",
  "..t.....t.",
  "d..D...D..d",
  "..d.....d..",
  ".D...t...D.",
  "T..d.t.d..T",
];

const SQ_LABEL = { T: "TW", D: "DW", t: "TL", d: "DL" };
function sqStyle(ch) {
  const c = _C2.sq;
  if (ch === "T") return { bg: c.tw, fg: c.twInk };
  if (ch === "D") return { bg: c.dw, fg: c.dwInk };
  if (ch === "t") return { bg: c.tl, fg: c.tlInk };
  if (ch === "d") return { bg: c.dl, fg: c.dlInk };
  return { bg: c.base, fg: _C2.inkSoft };
}

// One board cell — premium label, placed tile, or empty.
function BoardCell({ ch, tileLetter, tileVariant = "cream", size, placed }) {
  const sty = sqStyle(ch);
  const isStar = ch === "*";
  const labelFz = Math.max(8, Math.round(size * 0.26));
  if (tileLetter) {
    // Placed tile takes over the cell
    return (
      <div style={{
        width: size, height: size,
        display: "grid", placeItems: "center",
        background: sty.bg,
        borderRadius: 3,
      }}>
        <Tile letter={tileLetter} size={Math.round(size * 0.92)} variant={tileVariant} placed={placed} />
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size,
      background: isStar ? _C2.brown : sty.bg,
      color: isStar ? _C2.cream : sty.fg,
      borderRadius: 3,
      display: "grid", placeItems: "center",
      fontSize: labelFz, fontWeight: _W2.bold,
      letterSpacing: ".02em",
      fontFamily: _F2.sans,
      lineHeight: 1,
    }}>
      {isStar
        ? <span style={{ fontSize: Math.round(size * 0.6), color: _C2.cream }}>★</span>
        : SQ_LABEL[ch] || ""}
    </div>
  );
}

// Full board. `placements` is {[`r,c`]: { letter, placed?: bool, variant? }}
function Board({ rows, size = 580, placements = {} }) {
  const n = rows.length;
  const gap = 3;
  const cellSize = Math.floor((size - gap * (n + 1)) / n);
  return (
    <div style={{
      background: _C2.brown,
      padding: gap,
      borderRadius: _R2.card,
      boxShadow: "inset 0 0 0 1px " + _C2.brownDark + ", " + _SH2.card,
      display: "grid",
      gridTemplateColumns: `repeat(${n}, ${cellSize}px)`,
      gridAutoRows: `${cellSize}px`,
      gap,
      width: "fit-content",
    }}>
      {rows.flatMap((row, r) =>
        row.split("").map((ch, c) => {
          const p = placements[`${r},${c}`];
          return (
            <BoardCell
              key={`${r}-${c}`}
              ch={ch}
              size={cellSize}
              tileLetter={p?.letter}
              tileVariant={p?.variant}
              placed={p?.placed}
            />
          );
        })
      )}
    </div>
  );
}

// Player card on the scoreboard.
function PlayerCard({ name, score, active, tilesUsed = 0, isAI }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      alignItems: "center", gap: _S2.x4,
      padding: `${_S2.x4}px ${_S2.x5}px`,
      background: active ? _C2.paper : `color-mix(in oklab, ${_C2.paper} 70%, ${_C2.cream})`,
      border: active ? `2px solid ${_C2.brown}` : `1.5px solid ${_C2.stroke}`,
      borderRadius: _R2.card,
      boxShadow: active ? _SH2.cardHover : _SH2.card,
      minHeight: 76,
    }}>
      <span aria-hidden="true" style={{
        width: 48, height: 48, borderRadius: "50%",
        background: active ? _C2.brown : _C2.brownTint,
        color: active ? _C2.cream : _C2.brown,
        display: "grid", placeItems: "center",
        fontFamily: _F2.serif, fontWeight: _W2.bold, fontSize: 20,
        position: "relative",
      }}>
        {name.charAt(0)}
        {active && <span style={{
          position: "absolute", right: -2, bottom: -2,
          width: 14, height: 14, borderRadius: "50%",
          background: _C2.success, border: `2px solid ${_C2.paper}`,
        }} />}
      </span>
      <span style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: _Z2.bodyLg, fontWeight: _W2.med, color: _C2.ink }}>
          {name}{isAI && <span style={{ fontSize: _Z2.micro + 1, color: _C2.inkSoft, marginLeft: 8, fontWeight: _W2.reg }}>· Computer</span>}
        </span>
        <span style={{
          fontSize: _Z2.micro + 1, color: active ? _C2.success : _C2.inkSoft,
          textTransform: "uppercase", letterSpacing: ".08em", fontWeight: _W2.med,
          marginTop: 2,
        }}>{active ? "Your turn" : "Waiting"}</span>
      </span>
      <ScoreChip value={score} big tone={active ? "brown" : "ink"} />
    </div>
  );
}

// Tile rack — 7 tiles, generous spacing, tap targets ≥ 64px.
function Rack({ letters, selected = [], size = 72 }) {
  return (
    <div style={{
      display: "flex",
      gap: _S2.x3,
      padding: `${_S2.x3}px ${_S2.x4}px`,
      background: _C2.brown,
      borderRadius: _R2.card,
      boxShadow: "inset 0 2px 6px rgba(0,0,0,.25), " + _SH2.card,
    }}>
      {letters.map((l, i) => (
        <div key={i} style={{
          position: "relative",
          transition: `transform ${_M2.fast}`,
          transform: selected.includes(i) ? "translateY(-6px)" : "none",
        }}>
          <Tile letter={l} size={size} variant="cream" />
          {selected.includes(i) && (
            <span style={{
              position: "absolute", left: 0, right: 0, bottom: -10,
              height: 3, background: _C2.success, borderRadius: 2,
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// Tiles-left counter
function TilesLeft({ count = 38 }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: _S2.x2,
      padding: "6px 12px 6px 6px",
      background: _C2.paper,
      border: `1.5px solid ${_C2.stroke}`,
      borderRadius: _R2.pill,
      fontSize: _Z2.caption,
      fontWeight: _W2.med,
      color: _C2.ink,
    }}>
      <Tile letter="" size={26} variant="cream" showValue={false} />
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{count} left</span>
    </div>
  );
}

// Submit / Recall pair — used when there are pending placements
function ActionBar({ canSubmit, placedCount }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: _S2.x3,
      flexWrap: "wrap",
    }}>
      <Button kind="secondary" size="md">⇅ Shuffle</Button>
      <Button kind="secondary" size="md">⇌ Swap</Button>
      <Button kind="secondary" size="md">Pass</Button>
      <Button kind="destructive" size="md">Resign</Button>
      <div style={{ flex: 1 }} />
      {placedCount > 0 && (
        <Button kind="ghost" size="md">↺ Recall</Button>
      )}
      <Button kind="primary" size="md" disabled={!canSubmit}>
        Submit {placedCount > 0 && <span style={{
          marginLeft: 8, fontSize: _Z2.caption, opacity: .85,
        }}>· {placedCount} tile{placedCount === 1 ? "" : "s"}</span>}
      </Button>
    </div>
  );
}

// Placements for Classic mock — show some words on the board.
const CLASSIC_PLACEMENTS = {
  // Existing words
  "7,5":  { letter: "Q", variant: "cream" },
  "7,6":  { letter: "U", variant: "cream" },
  "7,7":  { letter: "I", variant: "cream" },
  "7,8":  { letter: "E", variant: "cream" },
  "7,9":  { letter: "T", variant: "cream" },
  "6,7":  { letter: "F", variant: "cream" },
  "8,7":  { letter: "N", variant: "cream" },
  "5,5":  { letter: "S", variant: "cream" },
  "6,5":  { letter: "O", variant: "cream" },
  "8,5":  { letter: "I", variant: "cream" },
  "9,5":  { letter: "L", variant: "cream" },
  // Pending placement — being composed
  "7,10": { letter: "S", variant: "cream", placed: true },
  "7,11": { letter: "T", variant: "cream", placed: true },
};

// ═══════════════════════════════════════════════════════════════
// In-game (Classic 15×15)
// ═══════════════════════════════════════════════════════════════
function InGameClassicScreen({ w = 1180, h = 820 }) {
  return (
    <Surface width={w} height={h} padding={0}>
      <BackPill />
      <UserChip name="George" />

      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: _S2.x8,
        padding: `${_S2.x16 + 8}px ${_S2.x8}px ${_S2.x4}px`,
        alignItems: "start",
      }}>
        {/* Board */}
        <div style={{ display: "flex", flexDirection: "column", gap: _S2.x4, alignItems: "center" }}>
          <Board rows={CLASSIC_BOARD} size={600} placements={CLASSIC_PLACEMENTS} />
        </div>

        {/* Sidebar */}
        <aside style={{ display: "flex", flexDirection: "column", gap: _S2.x4, paddingTop: _S2.x2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Tagline>Match · Classic 15 × 15</Tagline>
            <TilesLeft count={38} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: _S2.x3 }}>
            <PlayerCard name="George"   score={142} active />
            <PlayerCard name="Margaret" score={128} />
          </div>

          {/* Last move chip */}
          <div style={{
            padding: `${_S2.x3}px ${_S2.x4}px`,
            background: _C2.paper,
            border: `1.5px solid ${_C2.stroke}`,
            borderRadius: _R2.card,
            boxShadow: _SH2.card,
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <span style={{ fontSize: _Z2.micro + 1, color: _C2.inkSoft, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: _W2.med }}>Last move · Margaret</span>
            <span style={{ fontSize: _Z2.body, color: _C2.ink, fontFamily: _F2.serif, fontWeight: _W2.bold }}>SOIL · +18</span>
          </div>

          {/* Pending word preview */}
          <div style={{
            padding: `${_S2.x3}px ${_S2.x4}px`,
            background: _C2.successBg,
            border: `1.5px solid ${_C2.success}`,
            borderRadius: _R2.card,
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <span style={{ fontSize: _Z2.micro + 1, color: _C2.success, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: _W2.med }}>Pending</span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: _Z2.bodyLg, color: _C2.ink, fontFamily: _F2.serif, fontWeight: _W2.bold }}>QUIETST</span>
              <span style={{ fontSize: _Z2.body, color: _C2.success, fontWeight: _W2.med }}>+24</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom — rack + actions */}
      <div style={{
        padding: `${_S2.x4}px ${_S2.x8}px ${_S2.x6}px`,
        display: "flex", flexDirection: "column", gap: _S2.x4,
        borderTop: `1px solid ${_C2.creamDark}`,
        background: `color-mix(in oklab, ${_C2.cream} 60%, ${_C2.paper})`,
      }}>
        <div style={{ display: "flex", gap: _S2.x6, alignItems: "center", justifyContent: "space-between" }}>
          <Rack letters={["A", "E", "R", "I", "N", "G", "L"]} selected={[]} size={72} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <Tagline style={{ margin: 0, fontSize: _Z2.micro + 1 }}>Your rack</Tagline>
            <span style={{ fontSize: _Z2.caption, color: _C2.inkSoft }}>Drag a tile to the board</span>
          </div>
        </div>
        <ActionBar canSubmit placedCount={2} />
      </div>
    </Surface>
  );
}

// Placements for Mini mock
const MINI_PLACEMENTS = {
  "5,3": { letter: "B" },
  "5,4": { letter: "A" },
  "5,5": { letter: "K" },
  "5,6": { letter: "E" },
  "5,7": { letter: "R" },
  "6,5": { letter: "I" },
  "7,5": { letter: "N" },
  "8,5": { letter: "G" },
  // Pending
  "4,5": { letter: "M", placed: true },
};

// ═══════════════════════════════════════════════════════════════
// In-game (Mini 11×11)
// ═══════════════════════════════════════════════════════════════
function InGameMiniScreen({ w = 1180, h = 820 }) {
  return (
    <Surface width={w} height={h} padding={0}>
      <BackPill />
      <UserChip name="George" />

      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: _S2.x10,
        padding: `${_S2.x16 + 8}px ${_S2.x10}px ${_S2.x4}px`,
        alignItems: "start",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: _S2.x4, alignItems: "center" }}>
          <Board rows={MINI_BOARD} size={520} placements={MINI_PLACEMENTS} />
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: _S2.x4, paddingTop: _S2.x2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Tagline>Match · Mini 11 × 11</Tagline>
            <TilesLeft count={22} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: _S2.x3 }}>
            <PlayerCard name="George" score={64} />
            <PlayerCard name="Computer" score={71} active isAI />
          </div>

          <div style={{
            padding: `${_S2.x3}px ${_S2.x4}px`,
            background: _C2.paper,
            border: `1.5px solid ${_C2.stroke}`,
            borderRadius: _R2.card,
            boxShadow: _SH2.card,
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <span style={{ fontSize: _Z2.micro + 1, color: _C2.inkSoft, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: _W2.med }}>Computer is thinking</span>
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: _C2.brown,
                  opacity: .3 + i * 0.2,
                }} />
              ))}
            </div>
          </div>

          <div style={{
            padding: `${_S2.x4}px ${_S2.x5}px`,
            background: _C2.warnBg,
            border: `1.5px dashed ${_C2.warn}`,
            borderRadius: _R2.card,
            color: _C2.brownDark,
            fontSize: _Z2.caption,
            lineHeight: 1.4,
          }}>
            <strong style={{ display: "block", marginBottom: 4, fontSize: _Z2.body }}>Smaller board, bigger swings.</strong>
            Mini games tend to pivot on a single triple-word. Hold a high-value tile when you can.
          </div>
        </aside>
      </div>

      <div style={{
        padding: `${_S2.x4}px ${_S2.x10}px ${_S2.x6}px`,
        display: "flex", flexDirection: "column", gap: _S2.x4,
        borderTop: `1px solid ${_C2.creamDark}`,
        background: `color-mix(in oklab, ${_C2.cream} 60%, ${_C2.paper})`,
        opacity: .55,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Rack letters={["E", "T", "A", "O", "I", "N", "S"]} size={72} />
          <Tagline>Waiting for computer</Tagline>
        </div>
      </div>
    </Surface>
  );
}

Object.assign(window, {
  InGameClassicScreen, InGameMiniScreen,
  Board, BoardCell, PlayerCard, Rack, ActionBar, TilesLeft,
  CLASSIC_BOARD, MINI_BOARD,
});
