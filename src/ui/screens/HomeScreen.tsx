import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { enumerateSevenLetterPangrams } from "../../engine/games/spelling-bee.js";
import { useGameStore } from "../../store/gameStore.js";
import { loadInProgress, saveInProgress } from "../../storage/game-storage.js";
import { fromJSON, toJSON } from "../../storage/serializer.js";
import { playUiTap } from "../../audio/sounds.js";
import { tokens } from "../tokens.js";
import { MenuItem } from "../components/MenuItem.js";
import { MenuTile } from "../components/MenuTile.js";
import { SettingsModal } from "../components/SettingsModal.js";
import { UserNamePrompt } from "../components/UserNamePrompt.js";

// ─── Hero "shuffle settle" animation ──────────────────────────────
// Each tile enters scattered (random offset + rotation) and snaps into
// the grid with a brief spring overshoot. The tagline fades up during
// the last tile's settle. One-shot, no loop. Honors prefers-reduced-motion.

const HERO_WORDS = ["SCRABBLE", "BABBLE"] as const;
const HERO_TILE_COUNT = HERO_WORDS.reduce((n, w) => n + w.length, 0);
const HERO_TILE_DURATION_MS = 900;
const HERO_STAGGER_MAX_MS = 130;
const HERO_TAGLINE_DURATION_MS = 400;
const HERO_TAGLINE_OVERLAP_MS = 250; // tagline starts this many ms before the last tile lands
const HERO_TAGLINE_DELAY_MS =
  HERO_STAGGER_MAX_MS + HERO_TILE_DURATION_MS - HERO_TAGLINE_OVERLAP_MS;

/**
 * Deterministic per-tile-index variance. Mulberry32 stepped four times
 * per tile so each tile gets four independent draws (rx-sign, rx-mag,
 * ry-sign, ry-mag) plus one more for rotation. Stable across re-renders
 * so the same tile always lands the same way — only the mount triggers
 * a replay.
 */
function heroVariance(i: number): {
  rx: number;
  ry: number;
  rot: number;
  d: number;
} {
  const draw = (k: number): number => {
    let t = (i * 8 + k + 1) * 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const sign = (x: number): 1 | -1 => (x < 0.5 ? -1 : 1);
  const rx = sign(draw(0)) * (60 + draw(1) * 60); // ±60..±120 px
  const ry = sign(draw(2)) * (30 + draw(3) * 60); // ±30..±90 px
  const rot = (draw(4) - 0.5) * 44; // -22..+22 deg
  // Sequential stagger across all tiles (not random) so the eye reads
  // a clear left-to-right cascade rather than chaos.
  const d = (i / Math.max(1, HERO_TILE_COUNT - 1)) * HERO_STAGGER_MAX_MS;
  return { rx, ry, rot, d };
}

const HERO_KEYFRAMES = `
@keyframes hero-shuffle-settle {
  from {
    opacity: 0;
    transform: translate(var(--rx), var(--ry)) rotate(var(--rot)) scale(0.85);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes hero-tagline-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}
.hero-tile {
  display: inline-block;
  animation: hero-shuffle-settle ${HERO_TILE_DURATION_MS}ms cubic-bezier(.34, 1.4, .5, 1) both;
  animation-delay: var(--d, 0ms);
}
.hero-tagline {
  opacity: 0;
  animation: hero-tagline-up ${HERO_TAGLINE_DURATION_MS}ms ease-out both;
  animation-delay: ${HERO_TAGLINE_DELAY_MS}ms;
}
@media (prefers-reduced-motion: reduce) {
  .hero-tile, .hero-tagline {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
`;

/**
 * Home (main menu) — built from the design-handoff spec in
 * `design_handoff_scrabble_menu/README.md`. Centred 560 px column with
 * a tile-hero, six menu cards, and a small footer mark.
 *
 * The brand identity, user-chip, first-launch prompt, dictionary-load
 * alert, and underlying actions (resume / new / Tumbler / Bee /
 * export / import) are preserved from the previous Home — only the
 * presentation has been re-skinned. All inline styles match the design
 * tokens verbatim; nothing leaks into theme.ts because no other screen
 * uses these colours.
 */
export function HomeScreen(): JSX.Element {
  const hydrate = useGameStore((s) => s.hydrate);
  const setScreen = useGameStore((s) => s.setScreen);
  const dictionary = useGameStore((s) => s.dictionary);
  const currentUser = useGameStore((s) => s.currentUser);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);
  const [hasInProgress, setHasInProgress] = useState(false);
  // null === no prompt; "first" === mandatory first-launch greeting;
  // "change" === user clicked the top-right chip, may cancel out.
  const [namePrompt, setNamePrompt] = useState<"first" | "change" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const game = await loadInProgress();
      setHasInProgress(!!game && game.status.kind !== "ended");
    })();
  }, []);

  // First-launch: if no name has been saved yet, show the mandatory
  // welcome prompt. App.tsx has already finished initial hydration by
  // the time HomeScreen renders, so `currentUser` reflects what's in IDB.
  useEffect(() => {
    if (currentUser === null && namePrompt === null) {
      setNamePrompt("first");
    }
  }, [currentUser, namePrompt]);

  // Warm the Spelling Bee pangram cache in the background once the dictionary
  // is loaded. The first call walks the trie (~50-200 ms); doing it here means
  // tapping "Spelling Bee" feels instant.
  useEffect(() => {
    if (!dictionary) return;
    const handle = window.setTimeout(() => {
      try {
        enumerateSevenLetterPangrams(dictionary);
      } catch {
        // No-op — Bee will retry on its own screen.
      }
    }, 200);
    return () => window.clearTimeout(handle);
  }, [dictionary]);

  const onResume = async () => {
    const game = await loadInProgress();
    if (game) hydrate(game);
  };

  const onExport = async () => {
    const game = await loadInProgress();
    if (!game) return;
    const blob = new Blob([toJSON(game)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `scrabble-babble-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File) => {
    const text = await file.text();
    try {
      const game = fromJSON(text);
      await saveInProgress(game);
      hydrate(game);
    } catch {
      alert("Couldn't read that file. Make sure it's a valid Scrabble Babble export.");
    }
  };

  const dictMissing = dictionary === null;

  // Precompute the hero rows once per mount. heroVariance is deterministic
  // by index, so the visual is stable across renders; useMemo avoids
  // re-mapping the JSX every time HomeScreen re-renders for other reasons.
  const heroRows = useMemo(() => {
    let globalIndex = 0;
    return HERO_WORDS.map((word, rowIndex) => (
      <div
        key={rowIndex}
        style={{ display: "flex", alignItems: "flex-end", gap: 6 }}
      >
        {Array.from(word).map((ch) => {
          const i = globalIndex++;
          const { rx, ry, rot, d } = heroVariance(i);
          return (
            <span
              key={i}
              className="hero-tile"
              style={
                {
                  "--rx": `${rx.toFixed(2)}px`,
                  "--ry": `${ry.toFixed(2)}px`,
                  "--rot": `${rot.toFixed(2)}deg`,
                  "--d": `${d.toFixed(0)}ms`,
                } as CSSProperties
              }
            >
              <MenuTile
                letter={ch}
                size={66}
                variant={rowIndex === 0 ? "cream" : "brown"}
              />
            </span>
          );
        })}
      </div>
    ));
  }, []);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100%",
        background: tokens.color.cream,
        overflowX: "hidden",
        overflowY: "auto",
      }}
    >
      {/*
        Decorative paper-grain texture per spec. Two stacked radial-gradient
        dot patterns, fixed position so it scrolls cleanly, pointer-events
        none so the dots don't intercept taps. Opacity 0.35 keeps the
        cream surface dominant.
      */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: tokens.grain.opacity,
          backgroundImage: tokens.grain.image,
          backgroundSize: tokens.grain.size,
          backgroundPosition: tokens.grain.position,
        }}
      />

      {/*
        Top-right user chip — survives the redesign so the user identity
        feature isn't a regression. Sits over the shell, above the grain.
      */}
      {currentUser && (
        <button
          type="button"
          onClick={() => {
            playUiTap();
            setNamePrompt("change");
          }}
          aria-label="Change user"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 10,
            background: tokens.color.paper,
            color: tokens.color.ink,
            border: `1.5px solid ${tokens.color.stroke}`,
            borderRadius: tokens.radius.pill,
            padding: "8px 14px",
            fontSize: "0.95em",
            fontWeight: 600,
            minHeight: 40,
            touchAction: "manipulation",
            display: "flex",
            alignItems: "center",
            gap: 6,
            maxWidth: 220,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            cursor: "pointer",
            boxShadow: tokens.shadow.card,
          }}
        >
          <span aria-hidden>👤</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser}</span>
          <span aria-hidden style={{ opacity: 0.5, fontSize: "0.85em" }}>
            ›
          </span>
        </button>
      )}

      {/*
        Page shell — centred 560 px column. Padding 56 px top, 96 px bottom,
        28 px sides (18 px on ≤480 px viewports, handled via media query).
      */}
      <main
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "56px 28px 96px",
          display: "flex",
          flexDirection: "column",
          gap: 36,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* HERO — stacked tile rows + tagline. The tile-block is wrapped
            in an <h1> with aria-label so screen readers (and Playwright's
            getByRole("heading")) see one heading with accessible name
            "Scrabble Babble" — instead of reading out the individual
            tile letters as text. Each mount plays a one-shot shuffle-
            settle animation per tile; tagline fades up during the last
            tile's settle. See HERO_KEYFRAMES + heroVariance above. */}
        <style>{HERO_KEYFRAMES}</style>
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            paddingTop: 24,
          }}
        >
          <h1
            aria-label="Scrabble Babble"
            style={{
              margin: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            {heroRows}
          </h1>
          <p
            className="hero-tagline"
            style={{
              margin: 0,
              fontSize: tokens.size.caption,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: tokens.color.inkSoft,
              fontWeight: tokens.weight.reg,
              fontFamily: tokens.font.sans,
            }}
          >
            Words, on your terms.
          </p>
        </header>

        {/*
          Dict-missing safety alert — preserved from the previous Home so
          a corrupted / failed wordlist load doesn't silently strand the
          user. Re-styled to fit the new cream palette.
        */}
        {dictMissing && (
          <div
            role="alert"
            style={{
              background: tokens.color.warnBg,
              border: `1.5px solid ${tokens.color.warn}`,
              borderRadius: tokens.radius.card,
              padding: "12px 16px",
              color: tokens.color.brownDark,
              textAlign: "center",
              fontWeight: tokens.weight.med,
            }}
          >
            The word list didn't load — go online and refresh the page to download
            it (one-time, then it works offline).
          </div>
        )}

        {/* MENU — six cards, 10 px gap. Resume is the primary row when
            a saved game exists; otherwise we skip it entirely (showing a
            disabled brown button as the visual anchor would mislead). */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-label="Main menu">
          {hasInProgress && (
            <MenuItem
              icon="▶"
              label="Resume game"
              sublabel="Pick up where you left off"
              primary
              onClick={() => {
                void onResume();
              }}
            />
          )}
          <MenuItem
            icon="✦"
            label="New game"
            sublabel="Start a Scrabble match"
            onClick={() => setScreen({ kind: "new_game" })}
          />
          <MenuItem
            icon="⧗"
            label="Tumbler"
            sublabel="60-second sprint"
            onClick={() => setScreen({ kind: "tumbler" })}
          />
          <MenuItem
            icon="✷"
            label="Spelling Bee"
            sublabel="Daily puzzle"
            onClick={() => setScreen({ kind: "spelling_bee" })}
          />
          <MenuItem
            icon="♛"
            label="Scores"
            sublabel="Scrabble match scoreboard"
            onClick={() => setScreen({ kind: "scores" })}
          />
          <MenuItem
            icon="⚙"
            label="Settings"
            sublabel="Sounds, export, import"
            onClick={() => setSettingsOpen(true)}
          />
        </nav>

        {/* Footer — small "S" brand mark + version label. */}
        <footer
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            color: tokens.color.inkSoft,
            fontSize: tokens.size.micro,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginTop: 8,
          }}
        >
          <MenuTile letter="S" size={18} variant="brown" showValue={false} />
          <span>Scrabble Babble · v0.4</span>
        </footer>

        {/* Hidden file input for the Import flow. Reset BEFORE handling so
            re-selecting the same file still fires the change event. */}
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void onImport(f);
          }}
        />
      </main>

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onExport={() => {
            void onExport();
          }}
          onImport={() => fileInput.current?.click()}
          exportDisabled={!hasInProgress}
        />
      )}

      {namePrompt && (
        <UserNamePrompt
          initialName={namePrompt === "change" ? (currentUser ?? "") : ""}
          title={namePrompt === "change" ? "Change user" : "Welcome — what's your name?"}
          onSubmit={(name) => {
            setCurrentUser(name);
            setNamePrompt(null);
          }}
          // First-launch prompt is mandatory (no onCancel). Change-user is
          // dismissible.
          {...(namePrompt === "change" ? { onCancel: () => setNamePrompt(null) } : {})}
        />
      )}
    </div>
  );
}
