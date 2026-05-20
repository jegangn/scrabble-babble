import { useEffect, useRef, useState } from "react";
import { enumerateSevenLetterPangrams } from "../../engine/games/spelling-bee.js";
import { useGameStore } from "../../store/gameStore.js";
import { loadInProgress, saveInProgress } from "../../storage/game-storage.js";
import { fromJSON, toJSON } from "../../storage/serializer.js";
import { playUiTap } from "../../audio/sounds.js";
import { MenuItem } from "../components/MenuItem.js";
import { MenuTile, TileWord } from "../components/MenuTile.js";
import { UserNamePrompt } from "../components/UserNamePrompt.js";

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

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100%",
        background: "#F1E5CF",
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
          opacity: 0.35,
          backgroundImage:
            "radial-gradient(rgba(110,70,30,.05) 1px, transparent 1px), radial-gradient(rgba(110,70,30,.04) 1px, transparent 1px)",
          backgroundSize: "7px 7px, 11px 11px",
          backgroundPosition: "0 0, 3px 5px",
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
            background: "#FFFFFF",
            color: "#2A1A0C",
            border: "1.5px solid #C9B48E",
            borderRadius: 999,
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
            boxShadow:
              "0 1px 0 rgba(255,255,255,.7) inset, 0 1px 2px rgba(60,30,0,.06), 0 8px 22px -12px rgba(60,30,0,.18)",
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
            tile letters as text. */}
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
            <TileWord word="SCRABBLE" size={66} variant="cream" />
            <TileWord word="BABBLE" size={66} variant="brown" />
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#6B5641",
              fontWeight: 500,
              fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
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
              background: "#FFF1E6",
              border: "1.5px solid #B03030",
              borderRadius: 14,
              padding: "12px 16px",
              color: "#7A1F1F",
              textAlign: "center",
              fontWeight: 600,
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
          <MenuItem icon="✦" label="New game" onClick={() => setScreen({ kind: "new_game" })} />
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
            icon="↑"
            label="Export data"
            disabled={!hasInProgress}
            onClick={() => {
              void onExport();
            }}
          />
          <MenuItem icon="↓" label="Import data" onClick={() => fileInput.current?.click()} />
        </nav>

        {/* Footer — small "S" brand mark + version label. */}
        <footer
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            color: "#6B5641",
            fontSize: 12,
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
