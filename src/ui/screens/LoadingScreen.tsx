import { useGameStore } from "../../store/gameStore.js";
import { tokens } from "../tokens.js";
import { Tile } from "../components/Tile.js";

/**
 * Loading splash, lifted verbatim from
 * design_handoff_scrabble_system/Loading screen.html:
 *
 *   1. Cream-paper page with the dot-grain background that every other
 *      surface uses.
 *   2. The SCRABBLE / BABBLE hero in cream + brown Tile components,
 *      each tile staggered into a "drop-in" animation so the title
 *      assembles itself in front of the user.
 *   3. A three-dot pulsing progress indicator below the hero with the
 *      "Loading dictionary" tagline.
 *
 * When the engine signals the dictionary is ready (via the store), the
 * outer wrapper's opacity transitions 1 → 0 over 200 ms; App.tsx then
 * mounts the home screen. The aria-live region updates its text from
 * "Loading dictionary" to "Loaded — opening Scrabble Babble" so screen
 * readers announce the transition rather than seeing a silent swap.
 *
 * Honors prefers-reduced-motion: animations + fade are skipped, the
 * splash is plain static cream-paper with the same hero.
 */

const TOP_ROW = ["S", "C", "R", "A", "B", "B", "L", "E"] as const;
const BOTTOM_ROW = ["B", "A", "B", "B", "L", "E"] as const;
// WWF-inspired values — matches the engine's Classic distribution and
// MenuTile's hero. Reused inline (rather than imported) so the loading
// screen has no engine-config dependency and can render before the
// dictionary fetch even starts.
const VALUES: Record<string, number> = {
  A: 1, B: 4, C: 4, D: 2, E: 1, F: 4, G: 3, H: 3, I: 1, J: 10, K: 5, L: 2,
  M: 4, N: 2, O: 1, P: 4, Q: 10, R: 1, S: 1, T: 1, U: 2, V: 5, W: 4,
  X: 8, Y: 3, Z: 10,
};

// Per-tile stagger schedule from the spec: SCRABBLE rolls in first
// at 70 ms intervals, BABBLE follows 110 ms after the last cream tile
// (490 + 110 = 600 ms) at the same cadence.
const TILE_STEP_MS = 70;
const SECOND_ROW_OFFSET_MS = 600;

export function LoadingScreen(): JSX.Element {
  const { color } = tokens;
  // When the dictionary trie lands in the store, fade the splash out.
  // App.tsx waits 200 ms before swapping screens so the transition
  // reads as a fade rather than a cut.
  const ready = useGameStore((s) => s.dictionary !== null);
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Scrabble Babble"
      style={{
        position: "fixed",
        inset: 0,
        background: color.cream,
        color: color.ink,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        opacity: ready ? 0 : 1,
        transition: "opacity 200ms ease-out",
        // Paper grain — same recipe as Surface so the splash reads as
        // the same paper world as every other screen.
        backgroundImage: tokens.grain.image,
        backgroundSize: tokens.grain.size,
        backgroundPosition: tokens.grain.position,
      }}
    >
      {/* Keyframes live inside the splash so we don't pollute the global
          stylesheet. Scoped by class names prefixed "ls-". */}
      <style>{`
        @keyframes ls-tile-drop {
          0%   { opacity: 0; transform: translateY(-18px) rotate(-3deg) scale(.95); }
          60%  { opacity: 1; transform: translateY(2px) rotate(.5deg) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) rotate(0) scale(1); }
        }
        @keyframes ls-dot-pulse {
          0%, 60%, 100% { opacity: .25; transform: translateY(0); }
          30%           { opacity: 1;   transform: translateY(-3px); }
        }
        @keyframes ls-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-tile, .ls-status, .ls-dot { animation: none !important; opacity: 1 !important; }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
        }}
      >
        {/* Hero — SCRABBLE row over BABBLE row. aria-hidden because the
            outer role=status carries the accessible label. */}
        <div
          aria-hidden
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <HeroRow letters={TOP_ROW} variant="cream" startMs={0} />
          <HeroRow letters={BOTTOM_ROW} variant="brown" startMs={SECOND_ROW_OFFSET_MS} />
        </div>

        {/* Status block — three pulsing brown dots + the tagline.
            Wrapped in its own fade-in so it slides in after the hero
            has finished assembling (1100 ms per spec). */}
        <div
          className="ls-status"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            opacity: 0,
            animation: "ls-fade-in 400ms ease 1100ms forwards",
          }}
        >
          <div aria-hidden style={{ display: "flex", gap: 10 }}>
            <Dot delayMs={0} />
            <Dot delayMs={200} />
            <Dot delayMs={400} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: color.inkSoft,
              fontWeight: tokens.weight.reg,
              fontFamily: tokens.font.sans,
            }}
          >
            {ready ? "Loaded — opening Scrabble Babble" : "Loading dictionary"}
          </p>
        </div>
      </div>
    </div>
  );
}

interface HeroRowProps {
  readonly letters: ReadonlyArray<string>;
  readonly variant: "cream" | "brown";
  readonly startMs: number;
}

/**
 * One row of staggered tiles. Each tile's `animation` is set inline so
 * the per-tile delay falls out of `startMs + i × TILE_STEP_MS`. We pass
 * `animation` via the Tile component's `style` prop — Tile spreads
 * the caller's style last, so this overrides any default.
 */
function HeroRow({ letters, variant, startMs }: HeroRowProps): JSX.Element {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {letters.map((letter, i) => (
        <div
          key={i}
          className="ls-tile"
          style={{
            animation: `ls-tile-drop 600ms cubic-bezier(.4, 1.4, .5, 1) ${
              startMs + i * TILE_STEP_MS
            }ms backwards`,
          }}
        >
          <Tile letter={letter} value={VALUES[letter]} variant={variant} size={66} />
        </div>
      ))}
    </div>
  );
}

interface DotProps {
  readonly delayMs: number;
}

/** Small brown 14 px square pulsing dot — matches the spec exactly. */
function Dot({ delayMs }: DotProps): JSX.Element {
  return (
    <span
      className="ls-dot"
      style={{
        width: 14,
        height: 14,
        borderRadius: 3,
        background:
          "linear-gradient(165deg, #8A5934 0%, #6F4423 60%, #4E2E13 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,210,160,.25), inset 0 -1px 0 rgba(0,0,0,.25), 0 1px 2px rgba(0,0,0,.20)",
        opacity: 0.25,
        animation: `ls-dot-pulse 1.4s ease-in-out ${delayMs}ms infinite`,
      }}
    />
  );
}
