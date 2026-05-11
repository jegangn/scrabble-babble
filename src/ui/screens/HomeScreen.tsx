import { useEffect, useRef, useState } from "react";
import { APP_NAME } from "../../config/branding.js";
import { useGameStore } from "../../store/gameStore.js";
import { loadInProgress, saveInProgress } from "../../storage/game-storage.js";
import { fromJSON, toJSON } from "../../storage/serializer.js";
import { ACCENT } from "../theme.js";

export function HomeScreen(): JSX.Element {
  const hydrate = useGameStore((s) => s.hydrate);
  const setScreen = useGameStore((s) => s.setScreen);
  const [hasInProgress, setHasInProgress] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const game = await loadInProgress();
      setHasInProgress(!!game && game.status.kind !== "ended");
    })();
  }, []);

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

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
      <h1 style={{ fontSize: "3em", fontWeight: 700, color: ACCENT.primary }}>{APP_NAME}</h1>
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
            if (f) void onImport(f);
          }}
        />
      </div>
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
