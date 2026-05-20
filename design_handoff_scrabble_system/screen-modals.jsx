// Scrabble Babble — modals + mobile-portrait variants

const _T4 = window.TOKENS;
const _C4 = _T4.color, _S4 = _T4.space, _R4 = _T4.radius, _F4 = _T4.font, _Z4 = _T4.size, _W4 = _T4.weight, _SH4 = _T4.shadow;

// ════════════════════════════════════════════════════════════════
// Modal: pick-a-letter for a blank tile
// 7 cols × 4 rows = 28 cells (26 letters + Random + clear) — but the
// classic ask is "26 letters", so I'll do 7×4 with 2 trailing controls.
// ════════════════════════════════════════════════════════════════
function BlankPickerScreen({ w = 1180, h = 820 }) {
  return (
    <Surface width={w} height={h} padding={0}>
      <DimmedGameBg />
      <ModalFrame
        width={620}
        title="Pick a letter for your blank"
        sub="Tap any letter — the tile becomes worth 0 points but plays as that letter."
        footer={<Button kind="ghost" size="md">Cancel</Button>}
      >
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: _S4.x2,
        }}>
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => (
            <button key={l} style={{
              appearance: "none", border: "none", padding: 0,
              background: "transparent", cursor: "pointer",
              display: "grid", placeItems: "center",
              minHeight: 64,
            }}>
              <Tile letter={l} size={60} variant={l === "E" ? "brown" : "cream"} />
            </button>
          ))}
          {/* Pad to a clean 7×4 grid: 26 letters → +2 fillers */}
          <button style={fillerBtn()}>
            <span style={{ fontFamily: _F4.serif, fontWeight: _W4.bold, fontSize: 18, color: _C4.brown }}>?</span>
            <span style={{ fontSize: _Z4.micro + 1, color: _C4.inkSoft, marginTop: 2 }}>Surprise</span>
          </button>
          <button style={fillerBtn()}>
            <span style={{ fontSize: 18, color: _C4.inkSoft }}>↺</span>
            <span style={{ fontSize: _Z4.micro + 1, color: _C4.inkSoft, marginTop: 2 }}>Reset</span>
          </button>
        </div>
      </ModalFrame>
    </Surface>
  );
}
function fillerBtn() {
  return {
    appearance: "none",
    background: _C4.cream,
    border: `1.5px dashed ${_C4.stroke}`,
    borderRadius: _R4.tile,
    minHeight: 60,
    cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  };
}

// ════════════════════════════════════════════════════════════════
// Modal: swap tiles
// ════════════════════════════════════════════════════════════════
function SwapPickerScreen({ w = 1180, h = 820 }) {
  const rack = ["A", "E", "R", "I", "N", "G", "L"];
  const selected = [1, 4]; // E, N
  return (
    <Surface width={w} height={h} padding={0}>
      <DimmedGameBg />
      <ModalFrame
        width={680}
        title="Swap tiles"
        sub="Choose tiles to put back in the bag. You'll skip your turn and draw replacements."
        footer={
          <React.Fragment>
            <Button kind="ghost" size="md">Cancel</Button>
            <Button kind="primary" size="md">Swap {selected.length} tile{selected.length === 1 ? "" : "s"}</Button>
          </React.Fragment>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: _S4.x4 }}>
          <SectionLabel>Your rack — tap to select</SectionLabel>
          <div style={{
            display: "flex", gap: _S4.x3, justifyContent: "center",
            padding: `${_S4.x4}px ${_S4.x5}px`,
            background: _C4.brown,
            borderRadius: _R4.card,
            boxShadow: "inset 0 2px 6px rgba(0,0,0,.25)",
          }}>
            {rack.map((l, i) => {
              const on = selected.includes(i);
              return (
                <div key={i} style={{
                  position: "relative",
                  transform: on ? "translateY(-8px)" : "none",
                  transition: "transform 120ms ease",
                }}>
                  <Tile letter={l} size={70} variant={on ? "ghost" : "cream"} />
                  {on && <span style={{
                    position: "absolute", top: -8, right: -8,
                    width: 24, height: 24, borderRadius: "50%",
                    background: _C4.success, color: _C4.paper,
                    display: "grid", placeItems: "center",
                    fontWeight: _W4.bold, fontSize: 14,
                    boxShadow: "0 2px 6px rgba(0,0,0,.25)",
                    border: `2px solid ${_C4.paper}`,
                  }}>✓</span>}
                </div>
              );
            })}
          </div>
          <div style={{
            padding: `${_S4.x3}px ${_S4.x4}px`,
            background: _C4.warnBg,
            border: `1.5px solid ${_C4.warn}`,
            borderRadius: _R4.chip,
            display: "flex", alignItems: "center", gap: _S4.x3,
            color: _C4.brownDark, fontSize: _Z4.caption,
          }}>
            <span aria-hidden="true" style={{ fontWeight: _W4.bold }}>!</span>
            Only 7 tiles left in the bag — swap is usually unavailable below this point.
          </div>
        </div>
      </ModalFrame>
    </Surface>
  );
}

// ════════════════════════════════════════════════════════════════
// Modal: resign confirm (destructive)
// ════════════════════════════════════════════════════════════════
function ResignConfirmScreen({ w = 1180, h = 820 }) {
  return (
    <Surface width={w} height={h} padding={0}>
      <DimmedGameBg />
      <ModalFrame
        width={500}
        danger
        title="End this game?"
        sub="You'll forfeit the match. The current score stands — Margaret wins."
        footer={
          <React.Fragment>
            <Button kind="ghost" size="md">Keep playing</Button>
            <Button kind="destructive" size="md">End game now</Button>
          </React.Fragment>
        }
      >
        <div style={{
          padding: _S4.x4,
          background: _C4.dangerBg,
          borderRadius: _R4.chip,
          display: "grid", gridTemplateColumns: "auto 1fr",
          gap: _S4.x3, alignItems: "center",
          border: `1px dashed ${_C4.danger}`,
        }}>
          <span aria-hidden="true" style={{
            width: 36, height: 36, borderRadius: "50%",
            background: _C4.danger, color: _C4.paper,
            display: "grid", placeItems: "center",
            fontWeight: _W4.bold,
          }}>!</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <strong style={{ color: _C4.ink, fontWeight: _W4.med }}>This can't be undone.</strong>
            <span style={{ fontSize: _Z4.caption, color: _C4.inkSoft }}>The result will be added to your history.</span>
          </div>
        </div>
      </ModalFrame>
    </Surface>
  );
}

// ════════════════════════════════════════════════════════════════
// Modal: user-name prompt
// ════════════════════════════════════════════════════════════════
function NamePromptScreen({ w = 1180, h = 820 }) {
  return (
    <Surface width={w} height={h} padding={0}>
      <DimmedGameBg blur />
      <ModalFrame
        width={480}
        title="What should we call you?"
        sub="This shows on your score chip and in handoff prompts. You can change it later in Settings."
        footer={
          <React.Fragment>
            <Button kind="ghost" size="md">Cancel</Button>
            <Button kind="primary" size="md">Save</Button>
          </React.Fragment>
        }
      >
        <label style={{ display: "flex", flexDirection: "column", gap: _S4.x2 }}>
          <span style={{
            fontSize: _Z4.micro + 1, color: _C4.inkSoft,
            textTransform: "uppercase", letterSpacing: ".08em", fontWeight: _W4.med,
          }}>Your name</span>
          <div style={{
            display: "flex", alignItems: "center", gap: _S4.x3,
            border: `2px solid ${_C4.brown}`,
            borderRadius: _R4.card,
            padding: "14px 16px",
            background: _C4.paper,
            minHeight: 60,
            boxShadow: `0 0 0 4px color-mix(in oklab, ${_C4.brown} 14%, transparent)`,
          }}>
            <span aria-hidden="true" style={{
              width: 36, height: 36, borderRadius: "50%",
              background: _C4.brownTint, color: _C4.brown,
              display: "grid", placeItems: "center",
              fontFamily: _F4.serif, fontWeight: _W4.bold,
            }}>G</span>
            <span style={{ fontSize: _Z4.bodyLg, color: _C4.ink, fontWeight: _W4.med, flex: 1 }}>
              George<span style={{
                display: "inline-block", width: 2, height: 22,
                background: _C4.brown, marginLeft: 2, verticalAlign: "middle",
              }} />
            </span>
          </div>
          <span style={{ fontSize: _Z4.micro + 1, color: _C4.inkSoft, marginTop: _S4.x1 }}>2–16 characters</span>
        </label>
      </ModalFrame>
    </Surface>
  );
}

// ════════════════════════════════════════════════════════════════
// Dimmed game background — shared by all modals
// ════════════════════════════════════════════════════════════════
function DimmedGameBg({ blur }) {
  // Show a darkened board faintly behind so the modal context is clear.
  return (
    <div aria-hidden="true" style={{
      position: "absolute", inset: 0,
      background: `linear-gradient(180deg, ${_C4.cream} 0%, ${_C4.creamDark} 100%)`,
      filter: blur ? "blur(4px)" : "none",
    }}>
      <div style={{
        position: "absolute", top: 80, right: 60, opacity: .35,
        transform: "rotate(-3deg)",
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          {["S", "B"].map((l, i) => <Tile key={i} letter={l} size={56} variant="cream" />)}
        </div>
      </div>
      <div style={{
        position: "absolute", bottom: 60, left: 60, opacity: .25,
        transform: "rotate(2deg)",
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          {["P", "L", "A", "Y"].map((l, i) => <Tile key={i} letter={l} size={48} variant="cream" />)}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MOBILE PORTRAIT VARIANTS — 480 × 900
// Showing the two trickiest screens: In-game Classic + Spelling Bee
// ════════════════════════════════════════════════════════════════

function InGameClassicMobile({ w = 480, h = 900 }) {
  return (
    <Surface width={w} height={h} padding={0}>
      <BackPill style={{ top: _S4.x4, left: _S4.x4 }} />
      <UserChip name="George" style={{ top: _S4.x4, right: _S4.x4 }} />

      <div style={{
        marginTop: _S4.x16 + 6,
        padding: `0 ${_S4.x4}px`,
        display: "flex", flexDirection: "column", gap: _S4.x3,
      }}>
        {/* Compact scoreboard */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: _S4.x2,
        }}>
          <CompactPlayer name="George" score={142} active />
          <CompactPlayer name="Margaret" score={128} />
        </div>

        {/* Board */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Board rows={window.CLASSIC_BOARD} size={440} placements={window.CLASSIC_PLACEMENTS || {}} />
        </div>

        {/* Tiles-left + last-move */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <TilesLeft count={38} />
          <span style={{ fontSize: _Z4.caption, color: _C4.inkSoft }}>
            Last: <strong style={{ color: _C4.ink, fontWeight: _W4.med, fontFamily: _F4.serif }}>SOIL +18</strong>
          </span>
        </div>
      </div>

      {/* Bottom rack + actions */}
      <div style={{
        marginTop: "auto",
        padding: _S4.x4,
        background: `color-mix(in oklab, ${_C4.cream} 60%, ${_C4.paper})`,
        borderTop: `1px solid ${_C4.creamDark}`,
        display: "flex", flexDirection: "column", gap: _S4.x3,
      }}>
        <Rack letters={["A", "E", "R", "I", "N", "G", "L"]} size={52} />
        <div style={{ display: "flex", gap: _S4.x2, flexWrap: "wrap" }}>
          <Button kind="secondary" size="sm">⇅</Button>
          <Button kind="secondary" size="sm">⇌ Swap</Button>
          <Button kind="secondary" size="sm">Pass</Button>
          <div style={{ flex: 1 }} />
          <Button kind="primary" size="sm">Submit · 2</Button>
        </div>
      </div>
    </Surface>
  );
}

function CompactPlayer({ name, score, active }) {
  return (
    <div style={{
      padding: `${_S4.x2}px ${_S4.x3}px`,
      background: active ? _C4.paper : `color-mix(in oklab, ${_C4.paper} 70%, ${_C4.cream})`,
      border: active ? `2px solid ${_C4.brown}` : `1.5px solid ${_C4.stroke}`,
      borderRadius: _R4.card,
      display: "flex", alignItems: "center", gap: _S4.x2,
      minHeight: 56,
    }}>
      <span aria-hidden="true" style={{
        width: 32, height: 32, borderRadius: "50%",
        background: active ? _C4.brown : _C4.brownTint,
        color: active ? _C4.cream : _C4.brown,
        display: "grid", placeItems: "center",
        fontFamily: _F4.serif, fontWeight: _W4.bold,
      }}>{name.charAt(0)}</span>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: _Z4.caption, fontWeight: _W4.med, color: _C4.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
        <span style={{ fontFamily: _F4.serif, fontWeight: _W4.bold, fontSize: _Z4.h4, color: active ? _C4.brown : _C4.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{score}</span>
      </div>
    </div>
  );
}

function SpellingBeeMobile({ w = 480, h = 900 }) {
  return (
    <Surface width={w} height={h} padding={0}>
      <BackPill style={{ top: _S4.x4, left: _S4.x4 }} />
      <UserChip name="George" style={{ top: _S4.x4, right: _S4.x4 }} />

      <div style={{
        marginTop: _S4.x16 + 6,
        padding: `0 ${_S4.x4}px`,
        display: "flex", flexDirection: "column", gap: _S4.x4,
        alignItems: "center", flex: 1,
      }}>
        <div style={{ textAlign: "center" }}>
          <Tagline>Daily puzzle · May 20</Tagline>
          <h1 style={{
            fontFamily: _F4.serif, fontWeight: _W4.heavy,
            fontSize: _Z4.h2, margin: `${_S4.x2}px 0 0`,
            letterSpacing: "-0.02em", color: _C4.brown,
          }}>Spelling Bee</h1>
        </div>

        <CurrentWord word="STRAND" />

        <BeeHex
          letters={{ center: "A", outer: ["S", "T", "R", "N", "D", "L"] }}
          highlight={[5, "center", 2, 3]}
        />

        <div style={{ display: "flex", gap: _S4.x2, justifyContent: "center", width: "100%" }}>
          <Button kind="secondary" size="md">⌫</Button>
          <Button kind="secondary" size="md">⇅</Button>
          <Button kind="primary" size="md" style={{ flex: 1 }}>Submit</Button>
        </div>
      </div>

      <div style={{ padding: _S4.x4, background: `color-mix(in oklab, ${_C4.cream} 60%, ${_C4.paper})`, borderTop: `1px solid ${_C4.creamDark}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: _S4.x2, fontSize: _Z4.caption, color: _C4.inkSoft }}>
          <span style={{ textTransform: "uppercase", letterSpacing: ".1em", fontWeight: _W4.med }}>Rank · Solid</span>
          <span>74 / 120</span>
        </div>
        <div style={{ height: 10, borderRadius: 5, background: _C4.creamDark, overflow: "hidden" }}>
          <div style={{ height: "100%", width: "62%", background: _C4.brown, borderRadius: 5 }} />
        </div>
      </div>
    </Surface>
  );
}

Object.assign(window, {
  BlankPickerScreen, SwapPickerScreen, ResignConfirmScreen, NamePromptScreen,
  InGameClassicMobile, SpellingBeeMobile,
});
