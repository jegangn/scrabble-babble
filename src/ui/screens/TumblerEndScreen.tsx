import { useEffect, useState } from "react";
import { scoreTumblerWord } from "../../engine/games/tumbler.js";
import {
  getTumblerBest,
  getTumblerLeaderboard,
  recordTumblerScore,
  setTumblerBest,
  type LeaderboardEntry,
} from "../../storage/solo-storage.js";
import { useGameStore } from "../../store/gameStore.js";
import { BackToHomeButton } from "../components/BackToHomeButton.js";
import { ACCENT } from "../theme.js";

export function TumblerEndScreen(): JSX.Element | null {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const goHome = useGameStore((s) => s.goHome);
  const currentUser = useGameStore((s) => s.currentUser);

  // Loaded once on mount; we compare against this snapshot for the "new best" badge.
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<ReadonlyArray<LeaderboardEntry>>([]);

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
      // Record on the leaderboard (only if user has a name AND scored ≥1).
      // currentUser should always exist by the time the user reaches a
      // game mode (first-launch prompt enforces it), but guard defensively.
      if (currentUser && screen.score > 0) {
        await recordTumblerScore(currentUser, screen.score);
      }
      const board = await getTumblerLeaderboard();
      if (cancelled) return;
      setLeaderboard(board);
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
    <div
      className="flex h-full w-full flex-col items-center justify-start gap-4 p-4 overflow-y-auto"
      style={{ position: "relative" }}
    >
      <BackToHomeButton onClick={goHome} />
      <h2 style={{ fontSize: "2em", fontWeight: 700, color: ACCENT.primary, margin: 0 }}>
        Time's up!
      </h2>

      <div
        className="flex flex-col items-center gap-2"
        style={{
          background: "white",
          border: `3px solid ${isNewBest ? "#1f5e34" : ACCENT.primary}`,
          borderRadius: 14,
          padding: "14px 28px",
          minWidth: 260,
        }}
      >
        <div style={{ fontSize: "0.9em", opacity: 0.7 }}>Final score</div>
        <div style={{ fontSize: "2.6em", fontWeight: 800, color: ACCENT.primary, fontVariantNumeric: "tabular-nums" }}>
          {screen.score}
        </div>
        {previousBest !== null && (
          <div style={{ fontSize: "0.9em", color: isNewBest ? "#1f5e34" : ACCENT.text, opacity: isNewBest ? 1 : 0.7 }}>
            {isNewBest ? `🏆 New best! (was ${previousBest})` : `Personal best: ${Math.max(previousBest, screen.score)}`}
          </div>
        )}
      </div>

      {/* Two side-by-side panels on landscape: words found + leaderboard. */}
      <div className="flex gap-3 w-full" style={{ maxWidth: 720, flex: "1 0 auto" }}>
        <div
          className="flex-1"
          style={{
            background: "rgba(255,255,255,0.5)",
            border: `1px solid ${ACCENT.primary}33`,
            borderRadius: 10,
            padding: 10,
            maxHeight: "44vh",
            overflowY: "auto",
            minHeight: 160,
          }}
        >
          <div style={{ fontSize: "0.9em", color: ACCENT.text, opacity: 0.7, marginBottom: 6 }}>
            Words found ({screen.foundWords.length})
          </div>
          {screen.foundWords.length === 0 ? (
            <div style={{ opacity: 0.5 }}>No words this round.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {sortedWords.map((w) => (
                <li
                  key={w}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "2px 0",
                    fontSize: "0.95em",
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
        {/* Tumbler all-time leaderboard. Highlights the just-recorded entry
            (current user, matching score, recent timestamp). */}
        <div
          className="flex-1"
          style={{
            background: "rgba(255,255,255,0.5)",
            border: `1px solid ${ACCENT.primary}33`,
            borderRadius: 10,
            padding: 10,
            maxHeight: "44vh",
            overflowY: "auto",
            minHeight: 160,
          }}
        >
          <div style={{ fontSize: "0.9em", color: ACCENT.text, opacity: 0.7, marginBottom: 6 }}>
            🏆 Top scores
          </div>
          {leaderboard.length === 0 ? (
            <div style={{ opacity: 0.5 }}>No scores yet.</div>
          ) : (
            <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {leaderboard.map((entry, i) => {
                const isYou =
                  currentUser !== null &&
                  entry.name === currentUser &&
                  entry.score === screen.score &&
                  Math.abs(entry.timestamp - Date.now()) < 60_000;
                return (
                  <li
                    key={`${entry.name}-${entry.timestamp}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: isYou ? `${ACCENT.primary}22` : "transparent",
                      fontWeight: isYou ? 700 : 500,
                      fontSize: "0.95em",
                      gap: 8,
                    }}
                  >
                    <span style={{ display: "flex", gap: 8, overflow: "hidden", minWidth: 0, flex: 1 }}>
                      <span style={{ opacity: 0.5, minWidth: 18 }}>{i + 1}.</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.name}
                      </span>
                    </span>
                    {/* Date when the score was set. dd/MM/yyyy per project
                        defaults; helps users see how stale a top score is
                        (this is an all-time leaderboard so dates vary). */}
                    <span
                      style={{
                        opacity: 0.55,
                        fontSize: "0.85em",
                        fontWeight: 500,
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(entry.timestamp)}
                    </span>
                    <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }}>
                      {entry.score}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {/* Bottom Home button removed — the top-left pill is the single
          back-to-home entry point now. Play again gets the full width. */}
      <div className="flex gap-3 w-full max-w-md">
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

/**
 * Format an epoch timestamp as dd/MM/yyyy in local time, per project
 * defaults (CLAUDE.md). Used on the leaderboard so the user can see how
 * old each top score is.
 */
function formatDate(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
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
