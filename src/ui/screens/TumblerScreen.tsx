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
import { useGameStore } from "../../store/gameStore.js";
import { playError, playSuccess } from "../../audio/sounds.js";
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

  // One Tumbler "session" is bound to a seed; re-mounting (Play Again) draws fresh.
  const seed = useMemo(() => Date.now() & 0x7fffffff, []);
  const rack = useMemo(() => drawTumblerLetters(createPrng(seed)), [seed]);

  const [input, setInput] = useState("");
  const [foundWords, setFoundWords] = useState<ReadonlyArray<string>>([]);
  const [score, setScore] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(TUMBLER_DURATION_MS);
  const [started, setStarted] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);

  // Refs so the visibility handler always sees the latest values.
  const startedRef = useRef(false);
  const remainingMsRef = useRef(TUMBLER_DURATION_MS);
  const startedAtRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  // Start the timer on first keystroke. Once running, startedRef mirrors `started`.
  const handleInputChange = (value: string) => {
    setInput(value);
    if (!started && value.length > 0) {
      setStarted(true);
      startedRef.current = true;
    }
  };

  const secondsLeft = (timeLeftMs / 1000).toFixed(1);
  const timeFlashing = started && timeLeftMs <= 10_000;

  return (
    <div
      className="flex h-full w-full flex-col items-center p-4"
      style={{ background: ACCENT.surface, gap: 14 }}
    >
      {/* Header: timer + score + back */}
      <div
        className="flex justify-between items-center w-full max-w-2xl"
        style={{ minHeight: 56 }}
      >
        <button
          type="button"
          onClick={goHome}
          style={btnStyle("ghost")}
          aria-label="Back to home"
        >
          ← Home
        </button>
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
      </div>

      {/* Rack: 7 LetterPills. Tap-to-append: each pill onTap fires
          handleInputChange with the current input + the letter. This also
          starts the timer (handleInputChange checks `started`). The
          validator still enforces multiset legality on submit, so over-tapping
          a letter doesn't break the game — just yields "Not in rack". */}
      <div className="flex gap-2 flex-wrap justify-center" aria-label="Your letters">
        {rack.map((letter, i) => (
          <LetterPill
            key={i}
            letter={letter}
            size={64}
            onTap={() => handleInputChange(input + letter)}
          />
        ))}
      </div>

      {/* Input + submit */}
      <form
        className="flex gap-2 w-full max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          style={inputStyle}
          autoFocus
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder={started ? "Type a word…" : "Type to start"}
          disabled={timeLeftMs <= 0}
          aria-label="Word entry"
          maxLength={15}
        />
        <button
          type="submit"
          style={btnStyle("primary")}
          disabled={timeLeftMs <= 0 || input.trim().length === 0}
        >
          Enter
        </button>
      </form>

      {/* Flash toast */}
      <div style={{ minHeight: 32 }} aria-live="polite">
        {flash && <FlashRow flash={flash} />}
      </div>

      {/* Found words */}
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
    </div>
  );
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

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "12px 14px",
  fontSize: "1.4em",
  borderRadius: 8,
  border: `2px solid ${ACCENT.primary}`,
  background: "white",
  color: ACCENT.text,
  minHeight: 48,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

function btnStyle(variant: "primary" | "ghost"): React.CSSProperties {
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
