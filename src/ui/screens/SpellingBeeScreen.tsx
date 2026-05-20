import { useEffect, useMemo, useState } from "react";
import {
  enumerateBeeWords,
  enumerateSevenLetterPangrams,
  generatePuzzle,
  scoreBeeWord,
  validateBeeWord,
} from "../../engine/games/spelling-bee.js";
import type { BeePuzzle } from "../../engine/games/spelling-bee.js";
import type { Letter } from "../../engine/types.js";
import {
  getBeeProgress,
  localDateKey,
  setBeeProgress,
} from "../../storage/solo-storage.js";
import { useGameStore } from "../../store/gameStore.js";
import { playError, playSuccess } from "../../audio/sounds.js";
import { LetterPill } from "../components/LetterPill.js";
import { ACCENT } from "../theme.js";

type Flash =
  | { kind: "added"; word: string; points: number }
  | { kind: "duplicate"; word: string }
  | { kind: "invalid"; word: string; reason: string };

const FLASH_DURATION_MS = 1200;
// Pointy-top hex positions for 6 outer pills inside a 320×320 container with
// 80px pill side and 92px radius from centre. Order: top, upper-right,
// lower-right, bottom, lower-left, upper-left.
const HEX_POSITIONS = [
  { top: 28, left: 120 },
  { top: 74, left: 200 },
  { top: 166, left: 200 },
  { top: 212, left: 120 },
  { top: 166, left: 40 },
  { top: 74, left: 40 },
] as const;

export function SpellingBeeScreen(): JSX.Element | null {
  const dictionary = useGameStore((s) => s.dictionary);
  const goHome = useGameStore((s) => s.goHome);

  const dateKey = useMemo(() => localDateKey(), []);

  const [puzzle, setPuzzle] = useState<BeePuzzle | null>(null);
  const [outerOrder, setOuterOrder] = useState<ReadonlyArray<Letter>>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [foundWords, setFoundWords] = useState<ReadonlyArray<string>>([]);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [totalWords, setTotalWords] = useState<number | null>(null);
  const [puzzleError, setPuzzleError] = useState<string | null>(null);

  // Resolve today's puzzle once on mount.
  useEffect(() => {
    if (!dictionary) return;
    let p: BeePuzzle;
    try {
      p = generatePuzzle(dateKey, dictionary);
    } catch (e) {
      // Catastrophic dictionary state (corrupted gz, missing pangrams).
      // Surface a friendly error instead of crashing the React tree with
      // no way back to Home.
      console.error("Spelling Bee puzzle generation failed", e);
      setPuzzleError(
        e instanceof Error ? e.message : "Couldn't generate today's puzzle.",
      );
      return;
    }
    setPuzzle(p);
    setOuterOrder(p.letters.filter((l) => l !== p.center));
    void (async () => {
      const saved = await getBeeProgress(dateKey);
      if (saved) setFoundWords(saved.found);
    })();
    // Compute total possible words lazily after first paint (heavier walk).
    const handle = window.setTimeout(() => {
      try {
        const words = enumerateBeeWords(p, dictionary);
        setTotalWords(words.length);
      } catch (e) {
        console.error("Bee enumeration failed", e);
      }
    }, 50);
    return () => window.clearTimeout(handle);
  }, [dictionary, dateKey]);

  // NOTE: persistence happens explicitly inside `submit()` on accept, NOT via
  // a deps-based effect. An effect would echo the saved-progress hydration
  // back to IndexedDB on every mount, which was wasteful and confusing in
  // dev tools. Explicit-on-action is also easier to reason about.

  // Auto-clear flash toast.
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), FLASH_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [flash]);

  if (puzzleError) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-4 p-6"
        style={{ background: ACCENT.surface }}
      >
        <div style={{ fontSize: "1.4em", fontWeight: 700, color: ACCENT.danger }}>
          Couldn't load today's puzzle
        </div>
        <div style={{ opacity: 0.7, textAlign: "center", maxWidth: 360 }}>
          {puzzleError}. Try refreshing the page — if it persists, the dictionary
          file may be missing.
        </div>
        <button
          type="button"
          onClick={goHome}
          style={{
            background: ACCENT.primary,
            color: "white",
            border: "none",
            padding: "12px 20px",
            fontSize: "1.1em",
            fontWeight: 600,
            borderRadius: 10,
            minHeight: 48,
            touchAction: "manipulation",
          }}
        >
          Back to home
        </button>
      </div>
    );
  }

  if (!dictionary || !puzzle) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <p>Preparing today's puzzle…</p>
      </div>
    );
  }

  const score = foundWords.reduce((acc, w) => acc + scoreBeeWord(w, puzzle), 0);

  const appendLetter = (letter: Letter) => {
    if (currentWord.length >= 15) return;
    setCurrentWord(currentWord + letter);
  };

  const deleteLetter = () => {
    if (currentWord.length === 0) return;
    setCurrentWord(currentWord.slice(0, -1));
  };

  const submit = () => {
    const w = currentWord.toUpperCase();
    if (w.length === 0) return;
    setCurrentWord("");
    if (foundWords.includes(w)) {
      setFlash({ kind: "duplicate", word: w });
      playError();
      return;
    }
    const validation = validateBeeWord(puzzle, w, dictionary);
    if (!validation.ok) {
      const reason =
        validation.reason === "too_short"
          ? "Too short"
          : validation.reason === "missing_center"
            ? "Missing centre letter"
            : validation.reason === "uses_other_letters"
              ? "Letters not in puzzle"
              : "Not a word";
      setFlash({ kind: "invalid", word: w, reason });
      playError();
      return;
    }
    const points = scoreBeeWord(w, puzzle);
    const next = [w, ...foundWords];
    setFoundWords(next);
    setFlash({ kind: "added", word: w, points });
    // Persist explicitly so we only write on user action, not on hydration.
    void setBeeProgress({ dateKey, found: next });
    playSuccess();
  };

  const shuffleOuter = () => {
    // Simple rotation: shift by one. Deterministic and cheap.
    setOuterOrder((prev) => {
      if (prev.length <= 1) return prev;
      return [...prev.slice(1), prev[0]!];
    });
  };

  // Allow typing on a hidden keyboard input.
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Backspace") {
      e.preventDefault();
      deleteLetter();
    }
  };

  const onType = (raw: string) => {
    const upper = raw.toUpperCase();
    // Filter to allowed letters only.
    const allowed = new Set<string>(puzzle.letters);
    const filtered = Array.from(upper).filter((c) => allowed.has(c)).join("");
    setCurrentWord(filtered);
  };

  return (
    <div
      className="flex h-full w-full flex-col items-center p-4"
      style={{ background: ACCENT.surface, gap: 14 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center w-full max-w-2xl">
        <button type="button" onClick={goHome} style={btnStyle("ghost")}>
          ← Home
        </button>
        <div style={{ fontSize: "0.95em", opacity: 0.7 }}>{dateKey}</div>
        <div
          style={{
            fontSize: "1.4em",
            fontWeight: 700,
            color: ACCENT.primary,
            fontVariantNumeric: "tabular-nums",
          }}
          aria-label="Score"
        >
          {score} {totalWords !== null && (
            <span style={{ fontSize: "0.6em", opacity: 0.6 }}>
              · {foundWords.length}/{totalWords}
            </span>
          )}
        </div>
      </div>

      {/* Current word display */}
      <div
        style={{
          minHeight: 48,
          fontSize: "1.8em",
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: ACCENT.text,
        }}
        aria-label="Current word in progress"
      >
        {currentWord || <span style={{ opacity: 0.3 }}>tap or type</span>}
      </div>

      {/* Hex grid */}
      <div style={{ position: "relative", width: 320, height: 320 }} aria-label="Letter hex">
        {/* Centre */}
        <div style={{ position: "absolute", top: 120, left: 120 }}>
          <LetterPill
            letter={puzzle.center}
            size={80}
            center
            onTap={() => appendLetter(puzzle.center)}
          />
        </div>
        {/* Outer 6 in current shuffle order */}
        {outerOrder.map((letter, i) => {
          const pos = HEX_POSITIONS[i % HEX_POSITIONS.length]!;
          return (
            <div key={i} style={{ position: "absolute", top: pos.top, left: pos.left }}>
              <LetterPill letter={letter} size={80} onTap={() => appendLetter(letter)} />
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex gap-3 w-full max-w-md">
        <button type="button" onClick={deleteLetter} style={btnStyle("secondary")}>
          Delete
        </button>
        <button type="button" onClick={shuffleOuter} style={btnStyle("secondary")}>
          Shuffle
        </button>
        <button
          type="button"
          onClick={submit}
          style={btnStyle("primary")}
          disabled={currentWord.length === 0}
        >
          Enter
        </button>
      </div>

      {/* Hidden input to capture hardware-keyboard typing on iPad */}
      <input
        type="text"
        value={currentWord}
        onChange={(e) => onType(e.target.value)}
        onKeyDown={onKeyDown}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        style={{
          position: "absolute",
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0,
        }}
        aria-hidden
      />

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
          maxHeight: "30vh",
        }}
      >
        <div style={{ fontSize: "0.9em", color: ACCENT.text, opacity: 0.7, marginBottom: 6 }}>
          Found ({foundWords.length})
        </div>
        {foundWords.length === 0 ? (
          <div style={{ opacity: 0.5 }}>No words yet.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, columnCount: 2, columnGap: 16 }}>
            {[...foundWords].sort().map((w) => (
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
                  {scoreBeeWord(w, puzzle)}
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

// Re-warm the pangram cache so HomeScreen's idle warm is sufficient even if
// the user skipped Home. Inline import side-effect: just call the function
// at module top-level if `dictionary` is available globally. The HomeScreen
// also calls it; this is a safety belt for hot-reload paths.
void enumerateSevenLetterPangrams;

const flashStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: "0.95em",
  display: "inline-block",
};

function btnStyle(
  variant: "primary" | "secondary" | "ghost",
): React.CSSProperties {
  if (variant === "ghost") {
    return {
      background: "transparent",
      color: ACCENT.text,
      border: "none",
      padding: "8px 12px",
      fontSize: "1em",
      borderRadius: 8,
      touchAction: "manipulation",
      cursor: "pointer",
    };
  }
  return {
    flex: 1,
    background: variant === "primary" ? ACCENT.primary : "white",
    color: variant === "primary" ? "white" : ACCENT.text,
    border: variant === "primary" ? "none" : `2px solid ${ACCENT.primary}`,
    padding: "12px 16px",
    fontSize: "1em",
    fontWeight: 600,
    borderRadius: 8,
    minHeight: 48,
    touchAction: "manipulation",
    cursor: "pointer",
  };
}
