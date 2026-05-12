import { useEffect, useState } from "react";
import { scoreTumblerWord } from "../../engine/games/tumbler.js";
import { getTumblerBest, setTumblerBest } from "../../storage/solo-storage.js";
import { useGameStore } from "../../store/gameStore.js";
import { ACCENT } from "../theme.js";

export function TumblerEndScreen(): JSX.Element | null {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const goHome = useGameStore((s) => s.goHome);

  // Loaded once on mount; we compare against this snapshot for the "new best" badge.
  const [previousBest, setPreviousBest] = useState<number | null>(null);

  // Capture-and-write on mount so the score doesn't get re-persisted on re-renders.
  useEffect(() => {
    if (screen.kind !== "tumbler_end") return;
    let cancelled = false;
    void (async () => {
      const prev = await getTumblerBest();
      if (cancelled) return;
      setPreviousBest(prev);
      if (screen.score > prev) {
        await setTumblerBest(screen.score);
      }
    })();
    return () => {
      cancelled = true;
    };
    // We intentionally depend only on screen.score so a re-render with the
    // same finished session doesn't re-fire the IDB write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.kind === "tumbler_end" ? screen.score : 0]);

  if (screen.kind !== "tumbler_end") return null;

  const isNewBest = previousBest !== null && screen.score > previousBest;
  const sortedWords = [...screen.foundWords].sort((a, b) => scoreTumblerWord(b) - scoreTumblerWord(a));

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 p-6">
      <h2 style={{ fontSize: "2.4em", fontWeight: 700, color: ACCENT.primary }}>
        Time's up!
      </h2>

      <div
        className="flex flex-col items-center gap-2"
        style={{
          background: "white",
          border: `3px solid ${isNewBest ? "#1f5e34" : ACCENT.primary}`,
          borderRadius: 14,
          padding: "18px 28px",
          minWidth: 260,
        }}
      >
        <div style={{ fontSize: "0.9em", opacity: 0.7 }}>Final score</div>
        <div style={{ fontSize: "3em", fontWeight: 800, color: ACCENT.primary, fontVariantNumeric: "tabular-nums" }}>
          {screen.score}
        </div>
        {previousBest !== null && (
          <div style={{ fontSize: "0.95em", color: isNewBest ? "#1f5e34" : ACCENT.text, opacity: isNewBest ? 1 : 0.7 }}>
            {isNewBest ? `🏆 New best! (was ${previousBest})` : `Personal best: ${Math.max(previousBest, screen.score)}`}
          </div>
        )}
      </div>

      <div
        className="w-full max-w-md flex-1"
        style={{
          background: "rgba(255,255,255,0.5)",
          border: `1px solid ${ACCENT.primary}33`,
          borderRadius: 10,
          padding: 12,
          maxHeight: "40vh",
          overflowY: "auto",
        }}
      >
        <div style={{ fontSize: "0.9em", color: ACCENT.text, opacity: 0.7, marginBottom: 6 }}>
          Words found ({screen.foundWords.length})
        </div>
        {screen.foundWords.length === 0 ? (
          <div style={{ opacity: 0.5 }}>No words this round.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, columnCount: 2, columnGap: 16 }}>
            {sortedWords.map((w) => (
              <li
                key={w}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "2px 0",
                  fontSize: "1em",
                }}
              >
                <span>{w}</span>
                <span style={{ opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>
                  {scoreTumblerWord(w)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-3 w-full max-w-md">
        <button type="button" onClick={goHome} style={btnStyle("secondary")}>
          Home
        </button>
        <button
          type="button"
          onClick={() => setScreen({ kind: "tumbler" })}
          style={btnStyle("primary")}
        >
          Play again
        </button>
      </div>
    </div>
  );
}

function btnStyle(variant: "primary" | "secondary"): React.CSSProperties {
  return {
    flex: 1,
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
