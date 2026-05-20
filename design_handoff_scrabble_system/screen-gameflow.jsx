// Scrabble Babble — game-flow screens
// NewGameScreen, HandoffScreen, GameEndScreen

const _T = window.TOKENS;
const _C = _T.color, _S = _T.space, _R = _T.radius, _F = _T.font, _Z = _T.size, _W = _T.weight, _SH = _T.shadow;

// ═══════════════════════════════════════════════════════════════
// New Game
// ═══════════════════════════════════════════════════════════════
function NewGameScreen({ w = 1180, h = 820 }) {
  return (
    <Surface width={w} height={h} padding={0}>
      <BackPill />
      <UserChip name="George" />

      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: _S.x12,
        padding: `${_S.x16}px ${_S.x12}px ${_S.x8}px`,
        alignContent: "start",
      }}>
        {/* Left column ─────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: _S.x8 }}>
          <header>
            <Tagline>Start a game</Tagline>
            <h1 style={{
              fontFamily: _F.serif, fontWeight: _W.heavy,
              fontSize: _Z.h1, margin: `${_S.x2}px 0 0`,
              letterSpacing: "-0.02em", color: _C.brown,
            }}>New game</h1>
          </header>

          <section>
            <SectionLabel>Players</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: _S.x3 }}>
              <NameInput label="Player 1" value="George" you />
              <NameInput label="Player 2" value="Margaret" />
            </div>
          </section>

          <section>
            <SectionLabel>Opponent</SectionLabel>
            <Segmented options={["Hot-seat", "Computer"]} value="Computer" />
          </section>

          <section>
            <SectionLabel>Difficulty</SectionLabel>
            <DifficultyRow />
          </section>
        </div>

        {/* Right column ────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: _S.x6 }}>
          <section>
            <SectionLabel>Board</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: _S.x3 }}>
              <BoardOption variant="classic" label="Classic" sub="15 × 15" />
              <BoardOption variant="random" label="Random" sub="15 × 15 shuffled" />
              <BoardOption variant="mini" label="Mini" sub="11 × 11" selected />
            </div>
          </section>

          <section style={{ marginTop: "auto" }}>
            <Button kind="primary" size="lg" full>
              Start game
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </section>
        </div>
      </div>

      <footer style={{ padding: `${_S.x4}px ${_S.x8}px ${_S.x6}px` }}>
        <FooterMark />
      </footer>
    </Surface>
  );
}

function NameInput({ label, value, you }) {
  return (
    <label style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto",
      alignItems: "center", gap: _S.x4,
      background: _C.paper, border: `1.5px solid ${_C.stroke}`,
      borderRadius: _R.card, padding: "10px 16px 10px 10px",
      boxShadow: _SH.card, minHeight: 64,
    }}>
      <span aria-hidden="true" style={{
        width: 44, height: 44, borderRadius: "50%",
        background: _C.brownTint, color: _C.brown,
        display: "grid", placeItems: "center",
        fontFamily: _F.serif, fontWeight: _W.bold, fontSize: 18,
      }}>{value.charAt(0).toUpperCase()}</span>
      <span style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: _Z.micro + 1, color: _C.inkSoft, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: _W.med }}>{label}{you && " · You"}</span>
        <span style={{ fontSize: _Z.body, fontWeight: _W.med, color: _C.ink, marginTop: 2 }}>{value}</span>
      </span>
      <button style={{
        appearance: "none", border: "none", background: "transparent",
        color: _C.brown, fontSize: _Z.caption, fontWeight: _W.med,
        padding: "8px 10px", cursor: "pointer", minHeight: 44,
      }}>Edit</button>
    </label>
  );
}

function Segmented({ options, value }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: `repeat(${options.length}, 1fr)`,
      gap: 4, padding: 4,
      background: _C.creamDark, borderRadius: _R.card,
      border: `1px solid ${_C.stroke}`,
    }}>
      {options.map((o) => {
        const active = o === value;
        return (
          <button key={o} style={{
            appearance: "none", font: "inherit",
            background: active ? _C.paper : "transparent",
            color: active ? _C.ink : _C.inkSoft,
            border: active ? `1px solid ${_C.stroke}` : "1px solid transparent",
            borderRadius: _R.chip,
            padding: "14px 12px",
            fontSize: _Z.body, fontWeight: active ? _W.med : _W.reg,
            minHeight: 52, cursor: "pointer",
            boxShadow: active ? _SH.card : "none",
          }}>{o}</button>
        );
      })}
    </div>
  );
}

function DifficultyRow() {
  const items = [
    { id: "friendly", label: "Friendly", elo: "★",        note: "Forgiving" },
    { id: "easy",     label: "Easygoing",elo: "★ ★",      note: "Light push" },
    { id: "steady",   label: "Steady",   elo: "★ ★ ★",    note: "Balanced",   selected: true },
    { id: "sharp",    label: "Sharp",    elo: "★ ★ ★ ★",  note: "Plays well" },
    { id: "master",   label: "Master",   elo: "★ ★ ★ ★ ★",note: "Brutal" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: _S.x2 }}>
      {items.map((it) => (
        <button key={it.id} style={{
          appearance: "none", font: "inherit", textAlign: "left",
          background: it.selected ? _C.paper : `color-mix(in oklab, ${_C.paper} 70%, ${_C.cream})`,
          border: it.selected ? `2px solid ${_C.brown}` : `1.5px solid ${_C.stroke}`,
          borderRadius: _R.card,
          padding: "14px 10px",
          display: "flex", flexDirection: "column", gap: 4,
          minHeight: 88,
          cursor: "pointer",
          boxShadow: it.selected ? _SH.cardHover : _SH.card,
        }}>
          <span style={{ color: _C.brown, fontSize: 12, lineHeight: 1, letterSpacing: ".05em" }}>{it.elo}</span>
          <span style={{ fontWeight: _W.med, fontSize: _Z.body, color: _C.ink }}>{it.label}</span>
          <span style={{ fontSize: _Z.micro + 1, color: _C.inkSoft }}>{it.note}</span>
        </button>
      ))}
    </div>
  );
}

function BoardOption({ variant, label, sub, selected }) {
  return (
    <button style={{
      appearance: "none", font: "inherit", textAlign: "left",
      background: _C.paper,
      border: selected ? `2px solid ${_C.brown}` : `1.5px solid ${_C.stroke}`,
      borderRadius: _R.card,
      padding: _S.x4,
      display: "flex", flexDirection: "column", gap: _S.x3,
      cursor: "pointer",
      boxShadow: selected ? _SH.cardHover : _SH.card,
    }}>
      <MiniBoardThumb variant={variant} />
      <span style={{ fontWeight: _W.med, fontSize: _Z.body, color: _C.ink }}>{label}</span>
      <span style={{ fontSize: _Z.micro + 1, color: _C.inkSoft, marginTop: -4 }}>{sub}</span>
    </button>
  );
}

function MiniBoardThumb({ variant }) {
  // Small 9-tile schematic preview of the board layout.
  const c = _C.sq;
  const grids = {
    classic: [
      [c.tw, c.dl, c.tw], [c.dl, c.star, c.dl], [c.tw, c.dl, c.tw],
    ],
    random: [
      [c.tl, c.base, c.dw], [c.base, c.star, c.tw], [c.dw, c.dl, c.base],
    ],
    mini: [
      [c.tw, c.tl, c.tw], [c.dl, c.star, c.dl], [c.tw, c.tl, c.tw],
    ],
  };
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
      gap: 3, padding: 6,
      background: _C.brownTint, borderRadius: _R.chip,
      aspectRatio: "1 / 1",
    }}>
      {grids[variant].flat().map((bg, i) => (
        <div key={i} style={{
          background: bg, borderRadius: 4, aspectRatio: "1 / 1",
        }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Handoff overlay — "Pass the iPad to …"
// ═══════════════════════════════════════════════════════════════
function HandoffScreen({ w = 1180, h = 820, player = "Margaret" }) {
  return (
    <Surface width={w} height={h} padding={0}>
      {/* Dim background to suggest a game pause */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(180deg, ${_C.cream} 0%, ${_C.creamDark} 100%)`,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        display: "grid", placeItems: "center",
      }}>
        <div style={{
          width: 620,
          background: _C.paper,
          borderRadius: _R.panel,
          border: `1px solid ${_C.strokeSoft}`,
          boxShadow: _SH.modal,
          padding: `${_S.x12}px ${_S.x10}px ${_S.x10}px`,
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: _S.x6, textAlign: "center",
        }}>
          {/* Tile row spelling first name */}
          <div style={{ display: "flex", gap: 6 }}>
            {player.toUpperCase().slice(0, 8).split("").map((ch, i) => (
              <Tile key={i} letter={ch} size={64} variant="cream" />
            ))}
          </div>

          <Tagline>Next turn</Tagline>

          <h2 style={{
            margin: 0, fontFamily: _F.serif, fontWeight: _W.heavy,
            fontSize: _Z.h1, letterSpacing: "-0.02em", color: _C.brown,
            maxWidth: 480, lineHeight: 1.05,
          }}>Pass the iPad to {player}</h2>

          <p style={{ margin: 0, fontSize: _Z.bodyLg, color: _C.inkSoft, maxWidth: 460 }}>
            Hand the device over before tapping ready. {player}'s tiles will appear after you do.
          </p>

          <div style={{ display: "flex", gap: _S.x3, marginTop: _S.x4 }}>
            <Button kind="ghost" size="lg">Cancel turn</Button>
            <Button kind="primary" size="lg">I'm {player} — ready</Button>
          </div>
        </div>
      </div>
    </Surface>
  );
}

// ═══════════════════════════════════════════════════════════════
// Game End
// ═══════════════════════════════════════════════════════════════
function GameEndScreen({ w = 1180, h = 820 }) {
  return (
    <Surface width={w} height={h} padding={0}>
      <BackPill />
      <UserChip name="George" />

      <div style={{
        flex: 1,
        padding: `${_S.x16}px ${_S.x12}px ${_S.x6}px`,
        display: "grid",
        gridTemplateColumns: "1.1fr 1fr",
        gap: _S.x10,
        alignContent: "start",
      }}>
        {/* Left — winner + scoreboard */}
        <div style={{ display: "flex", flexDirection: "column", gap: _S.x6 }}>
          <div>
            <Tagline style={{ color: _C.success }}>Game over · Winner</Tagline>
            <h1 style={{
              fontFamily: _F.serif, fontWeight: _W.heavy,
              fontSize: _Z.display, lineHeight: 1, letterSpacing: "-0.025em",
              margin: `${_S.x3}px 0 0`, color: _C.brown,
            }}>Margaret wins.</h1>
            <p style={{ margin: `${_S.x3}px 0 0`, fontSize: _Z.bodyLg, color: _C.inkSoft, maxWidth: 480 }}>
              By 14 points — a steady, patient game. Best move: <strong style={{ color: _C.ink, fontWeight: _W.med }}>JINX</strong> on a triple, +47.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: _S.x3 }}>
            <FinalScoreRow name="Margaret" score={284} winner />
            <FinalScoreRow name="George"  score={270} />
          </div>

          <div style={{ display: "flex", gap: _S.x3, marginTop: "auto" }}>
            <Button kind="secondary" size="lg">Review board</Button>
            <Button kind="primary" size="lg" style={{ flex: 1 }}>
              Play again
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M3 8a5 5 0 1 0 1.7-3.8M3 3v3h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Right — stats card */}
        <div style={{
          background: _C.paper,
          border: `1.5px solid ${_C.stroke}`,
          borderRadius: _R.panel,
          boxShadow: _SH.card,
          padding: _S.x8,
          display: "flex", flexDirection: "column", gap: _S.x4,
        }}>
          <SectionLabel style={{ marginBottom: 0 }}>This game</SectionLabel>
          <StatRow label="Total moves" value="34" />
          <StatRow label="Top move" value="JINX · +47" />
          <StatRow label="Board" value="Classic 15 × 15" />
          <StatRow label="Mode" value="Hot-seat" />
          <StatRow label="Duration" value="38 min" />
          <StatRow label="Bingos played" value="2" />

          <div style={{
            marginTop: _S.x3, padding: _S.x4,
            background: _C.successBg, borderRadius: _R.chip,
            color: _C.success,
            fontSize: _Z.caption, fontWeight: _W.med,
            display: "flex", alignItems: "center", gap: _S.x3,
          }}>
            <span aria-hidden="true" style={{
              width: 22, height: 22, borderRadius: "50%",
              background: _C.success, color: _C.successBg,
              display: "grid", placeItems: "center", fontWeight: _W.bold,
            }}>✓</span>
            Saved to your history
          </div>
        </div>
      </div>

      <footer style={{ padding: `${_S.x4}px ${_S.x8}px ${_S.x6}px` }}>
        <FooterMark />
      </footer>
    </Surface>
  );
}

function FinalScoreRow({ name, score, winner }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto",
      alignItems: "center", gap: _S.x4,
      padding: `${_S.x4}px ${_S.x5}px`,
      background: winner ? `color-mix(in oklab, ${_C.successBg} 60%, ${_C.paper})` : _C.paper,
      border: winner ? `1.5px solid ${_C.success}` : `1.5px solid ${_C.stroke}`,
      borderRadius: _R.card,
      boxShadow: _SH.card,
    }}>
      <span aria-hidden="true" style={{
        width: 48, height: 48, borderRadius: "50%",
        background: winner ? _C.success : _C.brownTint,
        color: winner ? _C.paper : _C.brown,
        display: "grid", placeItems: "center",
        fontFamily: _F.serif, fontWeight: _W.bold, fontSize: 20,
      }}>{name.charAt(0)}</span>
      <span style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: _Z.bodyLg, fontWeight: _W.med, color: _C.ink }}>{name}</span>
        {winner && <span style={{ fontSize: _Z.micro + 1, color: _C.success, fontWeight: _W.med, letterSpacing: ".06em", textTransform: "uppercase" }}>Winner</span>}
      </span>
      <ScoreChip value={score} big tone={winner ? "success" : "ink"} />
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      padding: `${_S.x3}px 0`,
      borderBottom: `1px dashed ${_C.creamDark}`,
    }}>
      <span style={{ color: _C.inkSoft, fontSize: _Z.body }}>{label}</span>
      <span style={{ color: _C.ink, fontSize: _Z.body, fontWeight: _W.med, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

Object.assign(window, { NewGameScreen, HandoffScreen, GameEndScreen, MiniBoardThumb });
