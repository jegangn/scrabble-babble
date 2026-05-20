// Scrabble Babble — solo modes (Tumbler, Tumbler End, Spelling Bee)

const _T3 = window.TOKENS;
const _C3 = _T3.color, _S3 = _T3.space, _R3 = _T3.radius, _F3 = _T3.font, _Z3 = _T3.size, _W3 = _T3.weight, _SH3 = _T3.shadow, _M3 = _T3.motion;

// ═══════════════════════════════════════════════════════════════
// Big numeric/timer display — used in Tumbler header
// ═══════════════════════════════════════════════════════════════
function BigNumber({ value, label, tone = "ink", flash }) {
  const tones = {
    ink:     { bg: _C3.paper,    fg: _C3.ink,     br: _C3.stroke },
    brown:   { bg: _C3.brown,    fg: _C3.cream,   br: _C3.brownDark },
    success: { bg: _C3.successBg,fg: _C3.success, br: _C3.success },
    warn:    { bg: _C3.warnBg,   fg: _C3.brownDark, br: _C3.warn },
  };
  const p = tones[tone];
  return (
    <div style={{
      background: p.bg, color: p.fg,
      border: `1.5px solid ${p.br}`,
      borderRadius: _R3.panel,
      padding: `${_S3.x4}px ${_S3.x6}px`,
      display: "flex", flexDirection: "column", alignItems: "center",
      minWidth: 140,
      boxShadow: tone === "ink" ? _SH3.card : "none",
    }}>
      <span style={{
        fontSize: _Z3.micro + 1, letterSpacing: ".12em", textTransform: "uppercase",
        fontWeight: _W3.med, opacity: .75,
      }}>{label}</span>
      <span style={{
        fontFamily: _F3.serif, fontWeight: _W3.heavy,
        fontSize: _Z3.h1, lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
        marginTop: 4,
      }}>{value}</span>
    </div>
  );
}

// Current word strip — shows tiles being composed
function CurrentWord({ word, hint }) {
  if (!word || !word.length) {
    return (
      <div style={{
        height: 80,
        display: "grid", placeItems: "center",
        color: _C3.inkSoft, fontSize: _Z3.body,
        border: `2px dashed ${_C3.stroke}`,
        borderRadius: _R3.card,
        padding: _S3.x4,
      }}>{hint || "Tap rack tiles to build a word"}</div>
    );
  }
  return (
    <div style={{
      display: "flex", gap: 6, justifyContent: "center",
      padding: _S3.x3,
      background: _C3.paper,
      border: `1.5px solid ${_C3.stroke}`,
      borderRadius: _R3.card,
      boxShadow: _SH3.card,
      minHeight: 80, alignItems: "center",
    }}>
      {word.split("").map((ch, i) => (
        <Tile key={i} letter={ch} size={56} variant="cream" />
      ))}
    </div>
  );
}

// Found-words pill list
function FoundList({ words, columns = 4, title = "Found", count }) {
  return (
    <div style={{
      background: _C3.paper,
      border: `1.5px solid ${_C3.stroke}`,
      borderRadius: _R3.card,
      padding: _S3.x4,
      boxShadow: _SH3.card,
      display: "flex", flexDirection: "column", gap: _S3.x3,
      minHeight: 0,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <SectionLabel style={{ margin: 0 }}>{title}</SectionLabel>
        <span style={{ fontSize: _Z3.caption, color: _C3.inkSoft, fontVariantNumeric: "tabular-nums" }}>{count ?? words.length}</span>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 6,
        overflow: "hidden",
      }}>
        {words.map((w, i) => (
          <span key={i} style={{
            background: _C3.cream,
            border: `1px solid ${_C3.strokeSoft}`,
            borderRadius: _R3.chip,
            padding: "6px 10px",
            fontSize: _Z3.caption,
            fontWeight: _W3.med,
            color: _C3.ink,
            textAlign: "center",
            fontFamily: _F3.serif,
            letterSpacing: ".02em",
          }}>{w.toUpperCase()}</span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tumbler — 60-second sprint
// ═══════════════════════════════════════════════════════════════
function TumblerScreen({ w = 1180, h = 820 }) {
  return (
    <Surface width={w} height={h} padding={0}>
      <BackPill />
      <UserChip name="George" />

      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
        gap: _S3.x10,
        padding: `${_S3.x16 + 8}px ${_S3.x10}px ${_S3.x6}px`,
      }}>
        {/* Left — play area */}
        <div style={{ display: "flex", flexDirection: "column", gap: _S3.x6 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <Tagline>Solo mode</Tagline>
              <h1 style={{
                fontFamily: _F3.serif, fontWeight: _W3.heavy,
                fontSize: _Z3.h1, margin: `${_S3.x2}px 0 0`,
                letterSpacing: "-0.02em", color: _C3.brown,
              }}>Tumbler</h1>
            </div>
            <div style={{ display: "flex", gap: _S3.x3 }}>
              <BigNumber value="0:42" label="Time" tone="warn" />
              <BigNumber value="128" label="Score" tone="brown" />
            </div>
          </header>

          <CurrentWord word="TRAIN" />

          {/* Toast flash */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: -_S3.x2 }}>
            <Toast kind="success" title="QUARTZ · +24" sub="Bingo bonus" />
          </div>

          {/* Rack */}
          <div style={{ display: "flex", flexDirection: "column", gap: _S3.x3, marginTop: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Tagline>Your tiles · tap to compose</Tagline>
              <span style={{ fontSize: _Z3.caption, color: _C3.inkSoft }}>Tiles refill on submit</span>
            </div>
            <Rack letters={["T", "R", "A", "I", "N", "Q", "Z"]} selected={[0, 1, 2, 3, 4]} size={84} />
            <div style={{ display: "flex", gap: _S3.x3 }}>
              <Button kind="secondary" size="md">⇅ Shuffle</Button>
              <Button kind="ghost" size="md">↺ Clear</Button>
              <div style={{ flex: 1 }} />
              <Button kind="primary" size="md">Submit word</Button>
            </div>
          </div>
        </div>

        {/* Right — found words */}
        <aside style={{ display: "flex", flexDirection: "column", gap: _S3.x4 }}>
          <FoundList
            title="Found this round"
            count={9}
            words={["train", "rain", "tan", "art", "ran", "rant", "naira", "tin", "quartz"]}
          />
          <div style={{
            padding: `${_S3.x3}px ${_S3.x4}px`,
            background: _C3.paper,
            border: `1.5px solid ${_C3.stroke}`,
            borderRadius: _R3.card,
            boxShadow: _SH3.card,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: _Z3.caption, color: _C3.inkSoft, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: _W3.med }}>Personal best</span>
              <span style={{ fontFamily: _F3.serif, fontWeight: _W3.bold, fontSize: _Z3.h4, color: _C3.brown, fontVariantNumeric: "tabular-nums" }}>184</span>
            </div>
          </div>
        </aside>
      </div>
    </Surface>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tumbler End
// ═══════════════════════════════════════════════════════════════
function TumblerEndScreen({ w = 1180, h = 820 }) {
  const score = 196, best = 184, delta = score - best;
  return (
    <Surface width={w} height={h} padding={0}>
      <BackPill />
      <UserChip name="George" />

      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: _S3.x10,
        padding: `${_S3.x16}px ${_S3.x10}px ${_S3.x6}px`,
      }}>
        {/* Left — score + actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: _S3.x6 }}>
          <div>
            <Tagline style={{ color: _C3.success }}>Round complete · New best</Tagline>
            <h1 style={{
              fontFamily: _F3.serif, fontWeight: _W3.heavy,
              fontSize: _Z3.display, lineHeight: 1, letterSpacing: "-0.025em",
              margin: `${_S3.x3}px 0 0`, color: _C3.brown,
              fontVariantNumeric: "tabular-nums",
            }}>{score}</h1>
            <p style={{ margin: `${_S3.x3}px 0 0`, fontSize: _Z3.bodyLg, color: _C3.inkSoft }}>
              Up <strong style={{ color: _C3.success, fontWeight: _W3.med }}>+{delta}</strong> from your previous best of {best}. Twelve words, one bingo.
            </p>
          </div>

          {/* Compare bar */}
          <div style={{
            padding: _S3.x5,
            background: _C3.paper,
            border: `1.5px solid ${_C3.stroke}`,
            borderRadius: _R3.card,
            boxShadow: _SH3.card,
            display: "flex", flexDirection: "column", gap: _S3.x3,
          }}>
            <span style={{ fontSize: _Z3.micro + 1, color: _C3.inkSoft, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: _W3.med }}>Best vs this round</span>
            <CompareBar a={best} b={score} max={250} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: _Z3.caption, color: _C3.inkSoft }}>
              <span>Prev best · {best}</span>
              <span style={{ color: _C3.success, fontWeight: _W3.med }}>This round · {score}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: _S3.x3, marginTop: "auto" }}>
            <Button kind="secondary" size="lg" style={{ flex: 1 }}>Restart</Button>
            <Button kind="primary" size="lg" style={{ flex: 1 }}>
              Play again
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M3 8a5 5 0 1 0 1.7-3.8M3 3v3h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Right — words grid */}
        <FoundList
          title="Words you found"
          count={12}
          columns={3}
          words={["quartz", "train", "rain", "tan", "art", "ran", "rant", "naira", "tin", "intra", "tara", "irate"]}
        />
      </div>

      <footer style={{ padding: `${_S3.x4}px ${_S3.x8}px ${_S3.x6}px` }}>
        <FooterMark />
      </footer>
    </Surface>
  );
}

function CompareBar({ a, b, max }) {
  const aPct = Math.round((a / max) * 100);
  const bPct = Math.round((b / max) * 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ height: 14, borderRadius: 7, background: _C3.creamDark, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${aPct}%`, background: _C3.inkMuted, borderRadius: 7 }} />
      </div>
      <div style={{ height: 14, borderRadius: 7, background: _C3.creamDark, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${bPct}%`, background: _C3.success, borderRadius: 7 }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Spelling Bee — hex layout, drag-trail support
// ═══════════════════════════════════════════════════════════════

// One Bee letter pill (rounded, larger than Scrabble tiles).
function BeePill({ letter, center, highlighted, size = 110 }) {
  const bg = center
    ? `linear-gradient(165deg, ${_C3.brownMed} 0%, ${_C3.brown} 70%)`
    : `linear-gradient(165deg, #F8EBD0 0%, #E2C896 100%)`;
  const fg = center ? _C3.cream : _C3.ink;
  return (
    <div style={{
      width: size, height: size,
      borderRadius: "50%",
      background: bg, color: fg,
      display: "grid", placeItems: "center",
      fontFamily: _F3.serif, fontWeight: _W3.heavy,
      fontSize: Math.round(size * 0.5),
      boxShadow: center
        ? "0 6px 18px -6px rgba(60,30,0,.45), 0 1px 0 rgba(255,220,180,.18) inset, 0 -2px 0 rgba(0,0,0,.18) inset"
        : "0 4px 12px -4px rgba(60,30,0,.25), 0 1px 0 rgba(255,255,255,.55) inset",
      cursor: "pointer",
      transition: `transform ${_M3.fast}`,
      userSelect: "none",
      transform: highlighted ? "scale(0.94)" : "scale(1)",
      outline: highlighted ? `3px solid ${_C3.success}` : "none",
      outlineOffset: 4,
    }}>{letter}</div>
  );
}

// 7-tile hex arrangement positioned absolutely.
function BeeHex({ letters, highlight = [], onTap }) {
  // letters: { center, outer:[N,NE,SE,S,SW,NW] }
  const r = 100;        // ring radius
  const size = 110;
  const positions = [
    { x: 0,            y: -r },          // top
    { x:  r * 0.87,    y: -r * 0.5 },    // top-right
    { x:  r * 0.87,    y:  r * 0.5 },    // bot-right
    { x: 0,            y:  r },          // bottom
    { x: -r * 0.87,    y:  r * 0.5 },    // bot-left
    { x: -r * 0.87,    y: -r * 0.5 },    // top-left
  ];
  // Container — generous so action buttons don't overlap
  const box = 360;
  return (
    <div style={{
      position: "relative", width: box, height: box,
      margin: "0 auto",
    }}>
      {/* Subtle ring guide */}
      <div aria-hidden="true" style={{
        position: "absolute", top: "50%", left: "50%",
        width: r * 2 + size, height: r * 2 + size,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        border: `1px dashed ${_C3.strokeSoft}`,
      }} />

      {/* Trail polyline overlay — sample slide */}
      <svg
        width={box} height={box}
        viewBox={`-${box / 2} -${box / 2} ${box} ${box}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <polyline
          points={`${positions[5].x},${positions[5].y} 0,0 ${positions[2].x},${positions[2].y} ${positions[3].x},${positions[3].y}`}
          fill="none"
          stroke={_C3.success}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity=".75"
        />
        {/* Soft halo behind each touched node */}
        {[positions[5], { x: 0, y: 0 }, positions[2], positions[3]].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="14" fill={_C3.success} opacity=".18" />
        ))}
      </svg>

      {/* Center */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
      }}>
        <BeePill letter={letters.center} center size={size} highlighted={highlight.includes("center")} />
      </div>

      {/* Outer */}
      {positions.map((p, i) => (
        <div key={i} style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px))`,
        }}>
          <BeePill letter={letters.outer[i]} size={size} highlighted={highlight.includes(i)} />
        </div>
      ))}
    </div>
  );
}

function BeeScoreBar({ score, rank, next }) {
  // rank progress bar
  const pct = Math.min(100, Math.round((score / next) * 100));
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: _S3.x2,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: _Z3.caption, color: _C3.inkSoft }}>
        <span style={{ textTransform: "uppercase", letterSpacing: ".1em", fontWeight: _W3.med }}>Rank · {rank}</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{score} / {next}</span>
      </div>
      <div style={{ height: 10, borderRadius: 5, background: _C3.creamDark, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: _C3.brown, borderRadius: 5 }} />
      </div>
    </div>
  );
}

function SpellingBeeScreen({ w = 1180, h = 820 }) {
  return (
    <Surface width={w} height={h} padding={0}>
      <BackPill />
      <UserChip name="George" />

      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1.1fr 0.9fr",
        gap: _S3.x10,
        padding: `${_S3.x16 + 8}px ${_S3.x10}px ${_S3.x6}px`,
      }}>
        {/* Left — bee */}
        <div style={{ display: "flex", flexDirection: "column", gap: _S3.x4, alignItems: "center" }}>
          <header style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <Tagline>Daily puzzle</Tagline>
              <h1 style={{
                fontFamily: _F3.serif, fontWeight: _W3.heavy,
                fontSize: _Z3.h1, margin: `${_S3.x2}px 0 0`,
                letterSpacing: "-0.02em", color: _C3.brown,
              }}>Spelling Bee</h1>
            </div>
            <span style={{
              fontSize: _Z3.caption, color: _C3.inkSoft,
              textTransform: "uppercase", letterSpacing: ".12em", fontWeight: _W3.med,
            }}>Tues · May 20</span>
          </header>

          {/* Current word */}
          <div style={{ width: "100%" }}>
            <CurrentWord word="STRAND" />
          </div>

          {/* Hex */}
          <BeeHex
            letters={{ center: "A", outer: ["S", "T", "R", "N", "D", "L"] }}
            highlight={[5, "center", 2, 3]}
          />

          {/* Action row */}
          <div style={{ display: "flex", gap: _S3.x3, width: "100%", justifyContent: "center" }}>
            <Button kind="secondary" size="md">⌫ Delete</Button>
            <Button kind="secondary" size="md">⇅ Shuffle</Button>
            <Button kind="primary" size="md">Submit</Button>
          </div>
        </div>

        {/* Right — rank + found list */}
        <aside style={{ display: "flex", flexDirection: "column", gap: _S3.x4, minHeight: 0 }}>
          <div style={{
            padding: _S3.x5,
            background: _C3.paper,
            border: `1.5px solid ${_C3.stroke}`,
            borderRadius: _R3.card,
            boxShadow: _SH3.card,
            display: "flex", flexDirection: "column", gap: _S3.x3,
          }}>
            <BeeScoreBar score={74} rank="Solid" next={120} />
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: _Z3.body, color: _C3.ink,
            }}>
              <span>Words found <strong style={{ fontWeight: _W3.med }}>17 / 42</strong></span>
              <span style={{ color: _C3.success, fontWeight: _W3.med }}>1 pangram</span>
            </div>
          </div>

          <FoundList
            title="Found"
            count={17}
            columns={3}
            words={["strand", "stand", "land", "lard", "rand", "nards", "trans", "darts", "rats", "tarn", "tans", "ants", "darn", "arts", "stars", "trad", "nada"]}
          />
        </aside>
      </div>
    </Surface>
  );
}

Object.assign(window, {
  TumblerScreen, TumblerEndScreen, SpellingBeeScreen,
  BigNumber, CurrentWord, FoundList, BeePill, BeeHex,
});
