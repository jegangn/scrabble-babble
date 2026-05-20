import { useEffect, useRef, useState } from "react";
import { enumerateSevenLetterPangrams } from "../../engine/games/spelling-bee.js";
import { useGameStore } from "../../store/gameStore.js";
import { loadInProgress, saveInProgress } from "../../storage/game-storage.js";
import { fromJSON, toJSON } from "../../storage/serializer.js";
import { playUiTap } from "../../audio/sounds.js";
import { tokens } from "../tokens.js";
import { MenuItem } from "../components/MenuItem.js";
import { MenuTile, TileWord } from "../components/MenuTile.js";
import { SettingsModal } from "../components/SettingsModal.js";
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
