import { useEffect, useMemo, useRef, useState } from "react";
import {
  MIN_TUMBLER_WORD_LENGTH,
  TUMBLER_DURATION_MS,
  drawTumblerLetters,
  scoreTumblerWord,
  validateTumblerWord,
} from "../../engine/games/tumbler.js";
import { createPrng } from "../../engine/prng.js";
import type { Letter } from "../../engine/types.js";
import {
  getTumblerLeaderboard,
  type LeaderboardEntry,
} from "../../storage/solo-storage.js";
import { useGameStore } from "../../store/gameStore.js";
import { playError, playPlace, playSuccess, playUiTap } from "../../audio/sounds.js";
import { BackToHomeButton } from "../components/BackToHomeButton.js";
import { LetterPill } from "../components/LetterPill.js";
import { ACCENT } from "../theme.js";

type Flash =
  | { kind: "added"; word: string; points: number }
  | { kind: "duplicate"; word: string }
  | { kind: "invalid"; word: string; reason: string };

const FLASH_DURATION_MS = 1200;

export function TumblerScreen(): JSX.Element | null {
  const dictionary = useGameStore((s) => s.dictionary);
  const setScreen = useGameStore((s) => s.setScreen);
  const goHome = useGameStore((s) => s.goHome);

  // One Tumbler "session" is bound to a seed. Stored in state (not useMemo)
  // so the Restart button can mint a fresh seed without remounting the
  // whole screen — that would lose the leaderboard load + flash timer.
  const [seed, setSeed] = useState(() => Date.now() & 0x7fffffff);
  const rack = useMemo(() => drawTumblerLetters(createPrng(seed)), [seed]);

  const [input, setInput] = useState("");
  const [foundWords, setFoundWords] = useState<ReadonlyArray<string>>([]);
  const [score, setScore] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(TUMBLER_DURATION_MS);
  const [started, setStarted] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [leaderboard, setLeaderboard] = useState<ReadonlyArray<LeaderboardEntry>>([]);

  // Refs so the visibility handler always sees the latest values.
  const startedRef = useRef(false);
  const remainingMsRef = useRef(TUMBLER_DURATION_MS);
  const startedAtRef = useRef<number | null>(null);

  // Load the leaderboard once on mount. The end-screen records new scores;
  // when the user comes back to start another round the panel shows the
  // latest standings (we don't bother live-reloading mid-session).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const board = await getTumblerLeaderboard();
      if (!cancelled) setLeaderboard(board);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Restart the session: mint a fresh seed (re-draws the rack via useMemo),
   * reset all game state, and clear any in-flight timers. The leaderboard
   * panel will be visible again because `started` flips back to false.
   */
  const restartGame = () => {
    setSeed(Date.now() & 0x7fffffff);
    setInput("");
    setFoundWords([]);
    setScore(0);
    setTimeLeftMs(TUMBLER_DURATION_MS);
    setStarted(false);
    setFlash(null);
    startedRef.current = false;
    remainingMsRef.current = TUMBLER_DURATION_MS;
    startedAtRef.current = null;
  };

  // Drive the countdown. Effect re-runs when started flips true.
  useEffect(() => {
    if (!started) return;
    startedAtRef.current = Date.now();
    const tick = window.setInterval(() => {
      const start = startedAtRef.current;
      if (start === null) return;
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, remainingMsRef.current - elapsed);
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        window.clearInterval(tick);
      }
    }, 100);
    return () => window.clearInterval(tick);
  }, [started]);

  // Time-up handoff to the end screen. Stash final score on the screen route.
  useEffect(() => {
    if (started && timeLeftMs <= 0) {
      setScreen({ kind: "tumbler_end", score, foundWords });
    }
  }, [started, timeLeftMs, score, foundWords, setScreen]);

  // Pause-on-blur: stop the clock when the tab is backgrounded, resume when visible.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!startedRef.current) return;
      if (document.hidden) {
        // Bank elapsed time into remainingMs and stop the countdown.
        const start = startedAtRef.current;
        if (start !== null) {
          const elapsed = Date.now() - start;
          remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
          startedAtRef.current = null;
        }
      } else {
        // Resume from the banked remainder.
        startedAtRef.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Auto-clear the flash toast.
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), FLASH_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [flash]);

  if (!dictionary) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <p>Loading dictionary…</p>
      </div>
    );
  }

  const handleSubmit = () => {
    const raw = input.trim().toUpperCase();
    if (raw.length === 0) return;
    setInput("");

    if (foundWords.includes(raw)) {
      setFlash({ kind: "duplicate", word: raw });
      playError();
      return;
    }
    const validation = validateTumblerWord(rack, raw, dictionary);
    if (!validation.ok) {
      const reason =
        validation.reason === "too_short"
          ? `Need ${MIN_TUMBLER_WORD_LENGTH}+ letters`
          : validation.reason === "not_in_dictionary"
            ? "Not a word"
            : "Not in rack";
      setFlash({ kind: "invalid", word: raw, reason });
      playError();
      return;
    }
    const points = scoreTumblerWord(raw);
    setFoundWords([raw, ...foundWords]);
    setScore(score + points);
    setFlash({ kind: "added", word: raw, points });
    playSuccess();
  };

  // Start the timer on the first letter added. Tile taps drive this now
  // (hardware-keyboard entry was removed in favour of tap-only input).
  const startTimerIfNeeded = () => {
    if (!started) {
      setStarted(true);
      startedRef.current = true;
    }
  };

  const appendLetter = (letter: Letter) => {
    if (timeLeftMs <= 0) return;
    if (input.length >= 15) return;
    startTimerIfNeeded();
    setInput(input + letter);
    // Same warm thud as the Scrabble board placement — gives older users
    // unmistakable feedback that the tap registered.
    playPlace();
  };

  const deleteLetter = () => {
    if (input.length === 0) return;
    setInput(input.slice(0, -1));
  };

  const secondsLeft = (timeLeftMs / 1000).toFixed(1);
  const timeFlashing = started && timeLeftMs <= 10_000;

  return (
    <div
      className="flex h-full w-full flex-col items-center p-4"
      style={{ background: ACCENT.surface, gap: 14, position: "relative" }}
    >
      <BackToHomeButton onClick={goHome} />
      {/* Page title. The back-home pill sits floating at top-left; this
          title stays in the document flow so it can be centered above the
          timer / score / restart row below. */}
      <h1
        style={{
          fontSize: "1.8em",
          fontWeight: 700,
          color: ACCENT.primary,
          margin: 0,
        }}
      >
        Tumbler
      </h1>
      {/* Header: timer + score + (mid-game) restart. */}
      <div
        className="flex justify-center items-center w-full max-w-2xl"
        style={{ minHeight: 56, gap: 32 }}
      >
        {/*
          aria-live=polite so a screen reader can hear the countdown without
          interrupting other speech; we flip to assertive at 0 so "Time's up!"
          actually breaks through. The role="timer" + aria-atomic ensures the
          number is read as one chunk, not digit-by-digit.
        */}
        <div
          style={{
            fontSize: "2em",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: timeFlashing ? ACCENT.danger : ACCENT.text,
          }}
          role="timer"
          aria-live={timeLeftMs <= 0 ? "assertive" : "polite"}
          aria-atomic="true"
          aria-label={timeLeftMs <= 0 ? "Time's up" : "Time remaining"}
        >
          {secondsLeft}s
        </div>
        <div
          style={{
            fontSize: "1.4em",
            fontWeight: 700,
            color: ACCENT.primary,
            fontVariantNumeric: "tabular-nums",
          }}
          aria-label="Current score"
        >
          {score} pts
        </div>
        {/* Restart button — only shown after the timer has started, since
            pre-game there's nothing to restart. Drops the current score,
            re-draws the rack, and resets the clock. */}
        {started && (
          <button
            type="button"
            onClick={() => {
              playUiTap();
              restartGame();
            }}
            aria-label="Restart round"
            style={{
              background: "white",
              color: ACCENT.text,
              border: `2px solid ${ACCENT.primary}`,
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: "0.95em",
              fontWeight: 600,
              minHeight: 36,
              touchAction: "manipulation",
              cursor: "pointer",
            }}
          >
            ↻ Restart
          </button>
        )}
      </div>

      {/* Rack: 7 LetterPills. Tap to append. Per the latest UX direction,
          hardware-keyboard entry has been removed — this is the ONLY way
          to compose a word in Tumbler. The validator still enforces
          multiset legality on submit, so over-tapping the same letter
          shows "Not in rack" rather than corrupting state. */}
      <div className="flex gap-2 flex-wrap justify-center" aria-label="Your letters">
        {rack.map((letter, i) => (
          <LetterPill
            key={i}
            letter={letter}
            size={64}
            onTap={() => appendLetter(letter)}
          />
        ))}
      </div>

      {/* Read-only word display + Delete + Enter. The display is a div
          (not an input) so iPad Safari never tries to open its on-screen
          keyboard — a "no text input" mode the user explicitly requested. */}
      <div className="flex gap-2 w-full max-w-md items-stretch">
        <div
          aria-label="Word in progress"
          aria-live="polite"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "white",
            color: ACCENT.text,
            border: `2px solid ${ACCENT.primary}`,
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: "1.6em",
            fontWeight: 700,
            letterSpacing: "0.1em",
            minHeight: 56,
            fontVariantNumeric: "tabular-nums",
            userSelect: "none",
          }}
        >
          {input || (
            <span style={{ opacity: 0.35, fontSize: "0.7em", fontWeight: 500, letterSpacing: "normal" }}>
              {started ? "tap a letter…" : "tap a letter to start"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            playUiTap();
            deleteLetter();
          }}
          style={btnStyle("secondary")}
          disabled={timeLeftMs <= 0 || input.length === 0}
          aria-label="Delete last letter"
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          style={btnStyle("primary")}
          disabled={timeLeftMs <= 0 || input.length === 0}
        >
          Enter
        </button>
      </div>

      {/* Flash toast */}
      <div style={{ minHeight: 32 }} aria-live="polite">
        {flash && <FlashRow flash={flash} />}
      </div>

      {/*
        Bottom panel toggles between two views:
          - Pre-game (timer hasn't started): show the all-time leaderboard
            so the user sees what they're aiming for before they begin.
          - During / after game: show the live Found-words list.
        Once the timer runs out, the screen transitions to TumblerEndScreen
        which has both panels side-by-side.
      */}
      {!started ? (
        <div
          className="w-full max-w-md flex-1 overflow-y-auto"
          style={{
            background: "rgba(255,255,255,0.5)",
            border: `1px solid ${ACCENT.primary}33`,
            borderRadius: 10,
            padding: 12,
          }}
        >
          <div style={{ fontSize: "0.9em", color: ACCENT.text, opacity: 0.7, marginBottom: 6 }}>
            🏆 Top scores
          </div>
          {leaderboard.length === 0 ? (
            <div style={{ opacity: 0.5 }}>
              No scores yet. Tap a letter to start the 60-second sprint!
            </div>
          ) : (
            <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {leaderboard.map((entry, i) => (
                <li
                  key={`${entry.name}-${entry.timestamp}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "4px 8px",
                    borderRadius: 6,
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
              ))}
            </ol>
          )}
        </div>
      ) : (
        <div
          className="w-full max-w-md flex-1 overflow-y-auto"
          style={{
            background: "rgba(255,255,255,0.5)",
            border: `1px solid ${ACCENT.primary}33`,
            borderRadius: 10,
            padding: 12,
          }}
        >
          <div style={{ fontSize: "0.9em", color: ACCENT.text, opacity: 0.7, marginBottom: 6 }}>
            Found ({foundWords.length})
          </div>
          {foundWords.length === 0 ? (
            <div style={{ opacity: 0.5 }}>No words yet.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, columnCount: 2, columnGap: 16 }}>
              {foundWords.map((w) => (
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
      )}
    </div>
  );
}

/** Format an epoch timestamp as dd/MM/yyyy (local), per project defaults. */
function formatDate(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function FlashRow({ flash }: { flash: Flash }): JSX.Element {
  if (flash.kind === "added") {
    return (
      <div style={{ ...flashStyle, background: "#cdf5d8", color: "#1f5e34" }}>
        {flash.word} · +{flash.points}
      </div>
    );
  }
  if (flash.kind === "duplicate") {
    return (
      <div style={{ ...flashStyle, background: "#fff1cc", color: "#7a5e0d" }}>
        Already found
      </div>
    );
  }
  return (
    <div style={{ ...flashStyle, background: "#ffd8d8", color: ACCENT.danger }}>
      {flash.reason}
    </div>
  );
}

const flashStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: "0.95em",
  display: "inline-block",
};


function btnStyle(variant: "primary" | "secondary" | "ghost"): React.CSSProperties {
  if (variant === "ghost") {
    return {
      background: "transparent",
      color: ACCENT.text,
      border: "none",
      padding: "8px 12px",
      fontSize: "1em",
      fontWeight: 500,
      borderRadius: 8,
      touchAction: "manipulation",
      cursor: "pointer",
    };
  }
  if (variant === "secondary") {
    return {
      background: "white",
      color: ACCENT.text,
      border: `2px solid ${ACCENT.primary}`,
      padding: "12px 16px",
      fontSize: "1.2em",
      fontWeight: 700,
      borderRadius: 8,
      minHeight: 56,
      touchAction: "manipulation",
      cursor: "pointer",
    };
  }
  return {
    background: ACCENT.primary,
    color: "white",
    border: "none",
    padding: "12px 20px",
    fontSize: "1em",
    fontWeight: 600,
    borderRadius: 8,
    minHeight: 48,
    touchAction: "manipulation",
    cursor: "pointer",
  };
}
