import { useEffect, useRef, useState } from "react";
import { APP_NAME } from "../../config/branding.js";
import { enumerateSevenLetterPangrams } from "../../engine/games/spelling-bee.js";
import { useGameStore } from "../../store/gameStore.js";
import { loadInProgress, saveInProgress } from "../../storage/game-storage.js";
import { fromJSON, toJSON } from "../../storage/serializer.js";
import { ACCENT } from "../theme.js";
import { UserNamePrompt } from "../components/UserNamePrompt.js";

export function HomeScreen(): JSX.Element {
  const hydrate = useGameStore((s) => s.hydrate);
  const setScreen = useGameStore((s) => s.setScreen);
  const dictionary = useGameStore((s) => s.dictionary);
  const currentUser = useGameStore((s) => s.currentUser);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);
  const [hasInProgress, setHasInProgress] = useState(false);
  // null === no prompt; "first" === mandatory first-launch greeting;
  // "change" === user clicked "Change user", may cancel out.
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

  // App.tsx falls through to Home even if the dictionary failed to load. If
  // we hide that fact, the user taps a game mode and gets a broken screen
  // ("Preparing today's puzzle…" forever, AI never plays, etc.). Surface
  // a clear error and a retry hint up front.
  const dictMissing = dictionary === null;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6" style={{ position: "relative" }}>
      {/* Top-right user chip — shows current name, tap to change. */}
      {currentUser && (
        <button
          type="button"
          onClick={() => setNamePrompt("change")}
          aria-label="Change user"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "white",
            color: ACCENT.text,
            border: `2px solid ${ACCENT.primary}`,
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
          }}
        >
          <span aria-hidden>👤</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {currentUser}
          </span>
          <span aria-hidden style={{ opacity: 0.5, fontSize: "0.85em" }}>›</span>
        </button>
      )}
      <h1 style={{ fontSize: "3em", fontWeight: 700, color: ACCENT.primary }}>{APP_NAME}</h1>
      {dictMissing && (
        <div
          role="alert"
          style={{
            background: "#fff0f0",
            border: `2px solid ${ACCENT.danger}`,
            borderRadius: 10,
            padding: "12px 16px",
            color: ACCENT.danger,
            maxWidth: 360,
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          The word list didn't load — go online and refresh the page to
          download it (one-time, then it works offline).
        </div>
      )}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {hasInProgress && (
          <button
            type="button"
            onClick={onResume}
            style={btnStyle("primary")}
          >
            Resume game
          </button>
        )}
        <button
          type="button"
          onClick={() => setScreen({ kind: "new_game" })}
          style={btnStyle(hasInProgress ? "secondary" : "primary")}
        >
          New game
        </button>
        <button
          type="button"
          onClick={() => setScreen({ kind: "tumbler" })}
          style={btnStyle("secondary")}
        >
          Tumbler — 60 second sprint
        </button>
        <button
          type="button"
          onClick={() => setScreen({ kind: "spelling_bee" })}
          style={btnStyle("secondary")}
        >
          Spelling Bee — daily puzzle
        </button>
        <button type="button" onClick={onExport} style={btnStyle("secondary")}>
          Export current game
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} style={btnStyle("secondary")}>
          Import game
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            // Reset BEFORE handling so re-selecting the same file still fires
            // the change event next time. Without this, a failed import (alert
            // dismissed) couldn't be retried with the same file.
            e.target.value = "";
            if (f) void onImport(f);
          }}
        />
      </div>

      {namePrompt && (
        <UserNamePrompt
          initialName={namePrompt === "change" ? (currentUser ?? "") : ""}
          title={
            namePrompt === "change"
              ? "Change user"
              : "Welcome — what's your name?"
          }
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

function btnStyle(variant: "primary" | "secondary"): React.CSSProperties {
  return {
    background: variant === "primary" ? ACCENT.primary : "white",
    color: variant === "primary" ? "white" : ACCENT.text,
    border: variant === "primary" ? "none" : `2px solid ${ACCENT.primary}`,
    padding: "14px 20px",
    fontSize: "1.1em",
    fontWeight: 600,
    borderRadius: 10,
    minHeight: 56,
    touchAction: "manipulation",
  };
}
