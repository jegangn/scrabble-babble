// Scrabble Babble main menu

const TILE_VALUES = {
  A:1, B:3, C:3, D:2, E:1, F:4, G:2, H:4, I:1, J:8, K:5, L:1, M:3,
  N:1, O:1, P:3, Q:10, R:1, S:1, T:1, U:1, V:4, W:4, X:8, Y:4, Z:10,
};

// One Scrabble tile. variant: 'cream' | 'brown' | 'ghost'
function Tile({ letter, size = 72, variant = "cream", rot = 0, showValue = true, style }) {
  const fontPx = Math.round(size * 0.58);
  const ptPx   = Math.max(9, Math.round(size * 0.22));
  const radius = Math.max(6, Math.round(size * 0.13));
  const val = TILE_VALUES[letter];

  return (
    <div
      className={`stile stile--${variant}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        transform: `rotate(${rot}deg)`,
        ...style,
      }}
    >
      <span className="stile__letter" style={{ fontSize: fontPx, lineHeight: 1 }}>{letter}</span>
      {showValue && val != null && (
        <span className="stile__pt" style={{ fontSize: ptPx }}>{val}</span>
      )}
    </div>
  );
}

// Render a word as a row of tiles with subtle organic rotation.
function TileWord({ word, size = 72, variant = "cream", showValues = true, gap = 6, jitter = true, seed = 0 }) {
  const rand = (i) => {
    // deterministic-ish jitter from seed+index
    const x = Math.sin((i + 1) * 9.91 + seed * 3.7) * 1000;
    return x - Math.floor(x);
  };
  return (
    <div className="tile-word" style={{ gap }}>
      {word.split("").map((ch, i) => {
        if (ch === " ") return <div key={i} style={{ width: size * 0.35 }} aria-hidden="true" />;
        const rot = jitter ? (rand(i) - 0.5) * 2.6 : 0; // ±1.3°
        const liftY = jitter ? (rand(i + 11) - 0.5) * 2.5 : 0;
        return (
          <Tile
            key={i}
            letter={ch}
            size={size}
            variant={variant}
            rot={rot}
            showValue={showValues}
            style={{ transform: `rotate(${rot}deg) translateY(${liftY}px)` }}
          />
        );
      })}
    </div>
  );
}

// Title — two treatments.
function Title({ style }) {
  if (style === "serif") {
    return (
      <h1 className="title-serif">
        <span>Scrabble</span>
        <span>Babble</span>
      </h1>
    );
  }
  // tiles
  return (
    <div className="title-tiles" aria-label="Scrabble Babble">
      <TileWord word="SCRABBLE" size={66} variant="cream" jitter={false} seed={1} />
      <TileWord word="BABBLE"   size={66} variant="brown" jitter={false} seed={2} />
    </div>
  );
}

// Menu item.
function MenuItem({ icon, letter, label, sublabel, primary, buttonStyle, onClick }) {
  const showTile = buttonStyle === "tiles";
  const showIcon = buttonStyle === "cards" || buttonStyle === "tiles";
  return (
    <button
      className={`mi ${primary ? "mi--primary" : ""} mi--${buttonStyle}`}
      onClick={onClick}
      data-comment-anchor={`menu-${label}`}
    >
      {showTile && letter && (
        <Tile
          letter={letter}
          size={42}
          variant={primary ? "cream" : "brown"}
          showValue
        />
      )}
      {showIcon && !showTile && icon && (
        <span className="mi__icon" aria-hidden="true">{icon}</span>
      )}
      <span className="mi__body">
        <span className="mi__label">{label}</span>
        {sublabel && <span className="mi__sub">{sublabel}</span>}
      </span>
      <span className="mi__chev" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}

const MENU = [
  { id: "resume",  label: "Resume game",            letter: "R", icon: "▶", primary: true,
    sublabel: "Pick up where you left off" },
  { id: "new",     label: "New game",               letter: "N", icon: "✦" },
  { id: "tumbler", label: "Tumbler",                letter: "T", icon: "⧗",
    sublabel: "60-second sprint" },
  { id: "bee",     label: "Spelling Bee",           letter: "B", icon: "✷",
    sublabel: "Daily puzzle" },
  { id: "export",  label: "Export current game",    letter: "E", icon: "↑" },
  { id: "import",  label: "Import game",            letter: "I", icon: "↓" },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "titleStyle": "tiles",
  "buttonStyle": "cards",
  "background": "grain",
  "showSublabels": true,
  "primary": "#6F4423",
  "cream": "#F1E5CF"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [pressed, setPressed] = React.useState(null);

  // Map tweak values into CSS vars on root
  React.useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--brown", t.primary);
    r.style.setProperty("--cream", t.cream);
  }, [t.primary, t.cream]);

  return (
    <div className={`page bg-${t.background}`}>
      <main className="shell" data-screen-label="01 Main menu">
        <header className="hero">
          <Title style={t.titleStyle} />
          <p className="tagline">Words, on your terms.</p>
        </header>

        <nav className="menu">
          {MENU.map((m) => (
            <MenuItem
              key={m.id}
              {...m}
              sublabel={t.showSublabels ? m.sublabel : null}
              buttonStyle={t.buttonStyle}
              onClick={() => setPressed(m.id)}
            />
          ))}
        </nav>

        <footer className="foot">
          <span className="foot__mark">
            <Tile letter="S" size={18} variant="brown" showValue={false} />
          </span>
          <span>Scrabble Babble · v0.4</span>
        </footer>
      </main>

      {pressed && (
        <div className="toast" onAnimationEnd={() => setPressed(null)} key={pressed}>
          {MENU.find((m) => m.id === pressed)?.label}
        </div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Title" />
        <TweakRadio
          label="Treatment"
          value={t.titleStyle}
          options={["tiles", "serif"]}
          onChange={(v) => setTweak("titleStyle", v)}
        />

        <TweakSection label="Menu" />
        <TweakSelect
          label="Button style"
          value={t.buttonStyle}
          options={["cards", "tiles", "minimal"]}
          onChange={(v) => setTweak("buttonStyle", v)}
        />
        <TweakToggle
          label="Show sublabels"
          value={t.showSublabels}
          onChange={(v) => setTweak("showSublabels", v)}
        />

        <TweakSection label="Background" />
        <TweakRadio
          label="Surface"
          value={t.background}
          options={["plain", "grain", "board"]}
          onChange={(v) => setTweak("background", v)}
        />

        <TweakSection label="Palette" />
        <TweakColor
          label="Ink"
          value={t.primary}
          options={["#6F4423", "#3A2410", "#1F4D3A", "#7A2E2E"]}
          onChange={(v) => setTweak("primary", v)}
        />
        <TweakColor
          label="Paper"
          value={t.cream}
          options={["#F1E5CF", "#F4ECDA", "#EDE3CB", "#E8DCC0"]}
          onChange={(v) => setTweak("cream", v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
