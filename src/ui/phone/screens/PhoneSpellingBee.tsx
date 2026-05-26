import { useEffect, useMemo, useRef, useState } from "react";
import {
  enumerateSevenLetterPangrams,
  generatePuzzle,
  scoreBeeWord,
  validateBeeWord,
} from "../../../engine/games/spelling-bee.js";
import type { BeePuzzle } from "../../../engine/games/spelling-bee.js";
import type { Letter } from "../../../engine/types.js";
import {
  getBeeProgress,
  getBeeTopScores,
  localDateKey,
  recordBeeScore,
  setBeeProgress,
  type BeeTopEntry,
} from "../../../storage/solo-storage.js";
import { useGameStore } from "../../../store/gameStore.js";
import {
  playError,
  playPlace,
  playRecall,
  playSuccess,
  playUiTap,
} from "../../../audio/sounds.js";
import { tokens } from "../../tokens.js";
import { BeePill } from "../../components/BeePill.js";
import { BestScoresCard } from "../../components/BestScoresCard.js";
import { Button } from "../../components/Button.js";
import { CurrentWord } from "../../components/CurrentWord.js";
import { FoundList } from "../../components/FoundList.js";
import { Toast } from "../../components/Toast.js";
import { adaptBeeEntries } from "../../utils/best-entries.js";
import { PhoneShell } from "../PhoneShell.js";
import { PhoneTopBar } from "../components/PhoneTopBar.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type Flash =
  | { kind: "added"; word: string; points: number }
  | { kind: "duplicate"; word: string }
  | { kind: "invalid"; word: string; reason: string };

const FLASH_DURATION_MS = 1200;

// Hex geometry — same constants as the desktop screen so the hex is
// identical. 390 px phone has room: 420 px container centred in 390
// with a CSS scale-down on very narrow viewports matches the desktop
// media-query approach.
const HEX_BOX_W = 420;
const HEX_BOX_H = 280;
const HEX_RADIUS = 78;
const HEX_PILL = 64;

/** Outer-position offsets — pointy-top hex, clockwise from 12 o'clock. */
const HEX_OFFSETS = [
  { x: 0, y: -HEX_RADIUS },
  { x: HEX_RADIUS * 0.87, y: -HEX_RADIUS * 0.5 },
  { x: HEX_RADIUS * 0.87, y: HEX_RADIUS * 0.5 },
  { x: 0, y: HEX_RADIUS },
  { x: -HEX_RADIUS * 0.87, y: HEX_RADIUS * 0.5 },
  { x: -HEX_RADIUS * 0.87, y: -HEX_RADIUS * 0.5 },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Phone portrait Spelling Bee screen.
 *
 * Single-column layout for 390×844 portrait:
 *   PhoneTopBar     — back to Home, title "Spelling Bee"
 *   Score readout   — BigNumber-style score badge
 *   Hex             — centred, 420 px container CSS-scaled to fit 390 px
 *   CurrentWord     — live word strip with flash overlay
 *   Action row      — Shuffle / Clear / Submit
 *   BestScoresCard  — collapsed compact strip; tap to expand device-wide top 10
 *   FoundList       — fills remaining space, scrolls internally
 *
 * All store wiring (puzzle generation, daily progress persistence,
 * drag-to-spell, trail, submit/validation) is copied verbatim from the
 * desktop SpellingBeeScreen so both screens stay in parity.
 */
export function PhoneSpellingBee(): JSX.Element | null {
  const dictionary = useGameStore((s) => s.dictionary);
  const goHome = useGameStore((s) => s.goHome);
  const currentUser = useGameStore((s) => s.currentUser);

  const dateKey = useMemo(() => localDateKey(), []);

  const [puzzle, setPuzzle] = useState<BeePuzzle | null>(null);
  const [outerOrder, setOuterOrder] = useState<ReadonlyArray<Letter>>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [topScores, setTopScores] = useState<ReadonlyArray<BeeTopEntry>>([]);
  const [foundWords, setFoundWords] = useState<ReadonlyArray<string>>([]);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [puzzleError, setPuzzleError] = useState<string | null>(null);

  // Drag-to-spell refs.
  const dragActiveRef = useRef(false);
  const dragLetterRef = useRef<Letter | null>(null);
  const dragStartXYRef = useRef<{ x: number; y: number } | null>(null);
  const dragSawMoveRef = useRef(false);

  // Slide-trail state.
  const hexContainerRef = useRef<HTMLDivElement | null>(null);
  const trailFadeTimerRef = useRef<number | null>(null);
  const [trailPoints, setTrailPoints] = useState<
    ReadonlyArray<{ x: number; y: number }>
  >([]);
  const [trailFading, setTrailFading] = useState(false);

  // Clear any in-flight fade timer on unmount.
  useEffect(() => {
    return () => {
      if (trailFadeTimerRef.current !== null) {
        window.clearTimeout(trailFadeTimerRef.current);
      }
    };
  }, []);

  // Resolve today's puzzle on mount.
  useEffect(() => {
    if (!dictionary) return;
    let p: BeePuzzle;
    try {
      p = generatePuzzle(dateKey, dictionary);
    } catch (e) {
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
      const top = await getBeeTopScores(10);
      setTopScores(top);
    })();
  }, [dictionary, dateKey]);

  // Prewarm pangram cache (matches desktop behaviour).
  useEffect(() => {
    if (!dictionary) return;
    const t = window.setTimeout(() => {
      enumerateSevenLetterPangrams(dictionary);
    }, 200);
    return () => window.clearTimeout(t);
  }, [dictionary]);

  // Auto-clear the flash toast.
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), FLASH_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [flash]);

  const { color, space, font, size, weight } = tokens;

  // Loading / error states.
  if (puzzleError) {
    return (
      <PhoneShell
        top={<PhoneTopBar title="Spelling Bee" onBack={goHome} backLabel="Home" />}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: space.x4,
            padding: space.x6,
          }}
        >
          <div
            style={{
              fontSize: size.h4,
              fontWeight: weight.bold,
              color: color.danger,
              textAlign: "center",
            }}
          >
            Couldn't load today's puzzle
          </div>
          <div
            style={{
              fontSize: size.body,
              color: color.inkSoft,
              textAlign: "center",
            }}
          >
            {puzzleError}
          </div>
          <Button kind="primary" onClick={goHome}>
            Back to home
          </Button>
        </div>
      </PhoneShell>
    );
  }

  if (!dictionary || !puzzle) {
    return (
      <PhoneShell
        top={<PhoneTopBar title="Spelling Bee" onBack={goHome} backLabel="Home" />}
      >
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <p>Preparing today's puzzle…</p>
        </div>
      </PhoneShell>
    );
  }

  const score = foundWords.reduce((acc, w) => acc + scoreBeeWord(w, puzzle), 0);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const appendLetter = (letter: Letter): void => {
    if (currentWord.length >= 15) return;
    setCurrentWord(currentWord + letter);
    playPlace();
  };

  const clearWord = (): void => {
    if (currentWord.length === 0) return;
    setCurrentWord("");
  };

  const removeAt = (i: number): void => {
    if (i < 0 || i >= currentWord.length) return;
    setCurrentWord(currentWord.slice(0, i) + currentWord.slice(i + 1));
    playRecall();
  };

  const submit = (): void => {
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
    void (async () => {
      await setBeeProgress({ dateKey, found: next });
      if (currentUser) {
        const total = next.reduce(
          (acc, word) => acc + scoreBeeWord(word, puzzle),
          0,
        );
        await recordBeeScore(dateKey, currentUser, total);
        const top = await getBeeTopScores(10);
        setTopScores(top);
      }
    })();
    playSuccess();
  };

  const shuffleOuter = (): void => {
    setOuterOrder((prev) => {
      if (prev.length <= 1) return prev;
      return [...prev.slice(1), prev[0]!];
    });
  };

  const onPillTap = (letter: Letter): void => {
    appendLetter(letter);
  };

  // ─── Drag-to-spell pointer handlers ────────────────────────────────────────

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    dragStartXYRef.current = { x: e.clientX, y: e.clientY };
    dragSawMoveRef.current = false;
    dragActiveRef.current = true;
    dragLetterRef.current = null;
    if (trailFadeTimerRef.current !== null) {
      window.clearTimeout(trailFadeTimerRef.current);
      trailFadeTimerRef.current = null;
    }
    setTrailFading(false);
    const containerEl = hexContainerRef.current;
    if (containerEl) {
      const r = containerEl.getBoundingClientRect();
      setTrailPoints([{ x: e.clientX - r.left, y: e.clientY - r.top }]);
    } else {
      setTrailPoints([]);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragActiveRef.current) return;
    const start = dragStartXYRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!dragSawMoveRef.current && dx * dx + dy * dy < 64) return;
    if (!dragSawMoveRef.current) {
      dragSawMoveRef.current = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Some browsers reject capture if the pointer isn't down — fine.
      }
    }
    const containerEl = hexContainerRef.current;
    if (containerEl) {
      const r = containerEl.getBoundingClientRect();
      const fx = e.clientX - r.left;
      const fy = e.clientY - r.top;
      setTrailPoints((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          Math.abs(last.x - fx) < 4 &&
          Math.abs(last.y - fy) < 4
        ) {
          return prev;
        }
        return [...prev, { x: fx, y: fy }];
      });
    }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const pill = el?.closest("[data-bee-letter]") as HTMLElement | null;
    const letter = pill?.dataset.beeLetter as Letter | undefined;
    if (!letter) return;
    if (dragLetterRef.current === letter) return;
    dragLetterRef.current = letter;
    setCurrentWord((cw) => (cw.length >= 15 ? cw : cw + letter));
    playPlace();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    dragActiveRef.current = false;
    dragLetterRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Capture might never have been taken on a quick tap.
    }
    if (dragSawMoveRef.current) {
      setTrailFading(true);
      trailFadeTimerRef.current = window.setTimeout(() => {
        setTrailPoints([]);
        setTrailFading(false);
        trailFadeTimerRef.current = null;
      }, 700);
    }
  };

  const onPointerCancel = (): void => {
    dragActiveRef.current = false;
    dragLetterRef.current = null;
    if (dragSawMoveRef.current && trailPoints.length > 0) {
      setTrailFading(true);
      trailFadeTimerRef.current = window.setTimeout(() => {
        setTrailPoints([]);
        setTrailFading(false);
        trailFadeTimerRef.current = null;
      }, 700);
    }
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (dragSawMoveRef.current) {
      e.stopPropagation();
      e.preventDefault();
      dragSawMoveRef.current = false;
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <PhoneShell
      top={
        <PhoneTopBar title="Spelling Bee" onBack={goHome} backLabel="Home" />
      }
    >
      {/* Scale the 420 px hex container to fit the 390 px phone. */}
      <style>{`
        @media (max-width: 440px) {
          .phone-bee-hex-wrap {
            transform: scale(0.88);
            transform-origin: top center;
            margin-bottom: -36px;
          }
        }
        @media (max-width: 360px) {
          .phone-bee-hex-wrap {
            transform: scale(0.75);
            transform-origin: top center;
            margin-bottom: -72px;
          }
        }
      `}</style>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: space.x2,
          padding: `${space.x3}px ${space.x2}px ${space.x3}px`,
        }}
      >
        {/* Score readout */}
        <div
          style={{
            display: "flex",
            gap: space.x3,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: color.brown,
              color: color.cream,
              border: `1.5px solid ${color.brownDark}`,
              borderRadius: tokens.radius.panel,
              padding: `${space.x2}px ${space.x4}px`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 90,
            }}
          >
            <span
              style={{
                fontSize: size.micro,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                fontWeight: weight.med,
                opacity: 0.75,
              }}
            >
              Score
            </span>
            <span
              style={{
                fontFamily: font.serif,
                fontWeight: weight.heavy,
                fontSize: size.h3,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                marginTop: 2,
              }}
            >
              {score}
            </span>
          </div>
        </div>

        {/* Hex — centred, scale-wrapped for narrow phones */}
        <div
          className="phone-bee-hex-wrap"
          style={{ width: HEX_BOX_W, height: HEX_BOX_H, flexShrink: 0, alignSelf: "center" }}
        >
          <div
            ref={hexContainerRef}
            style={{
              position: "relative",
              width: HEX_BOX_W,
              height: HEX_BOX_H,
              touchAction: "none",
            }}
            aria-label="Letter hex"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onClickCapture={onClickCapture}
          >
            {/* Decorative ring guide */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: HEX_RADIUS * 2 + HEX_PILL,
                height: HEX_RADIUS * 2 + HEX_PILL,
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
                border: `1px dashed ${color.strokeSoft}`,
                pointerEvents: "none",
              }}
            />

            {/* Slide-trail polyline overlay */}
            {trailPoints.length >= 2 && (
              <svg
                width={HEX_BOX_W}
                height={HEX_BOX_H}
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  pointerEvents: "none",
                  zIndex: 1,
                  opacity: trailFading ? 0 : 0.75,
                  transition: trailFading ? "opacity 600ms ease-out" : "none",
                }}
              >
                <polyline
                  points={trailPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke={color.success}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}

            {/* Centre pill */}
            <div
              data-bee-letter={puzzle.center}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <BeePill
                letter={puzzle.center}
                center
                size={HEX_PILL}
                onTap={() => onPillTap(puzzle.center)}
              />
            </div>

            {/* Outer pills */}
            {outerOrder.map((letter, i) => {
              const pos = HEX_OFFSETS[i % HEX_OFFSETS.length]!;
              return (
                <div
                  key={i}
                  data-bee-letter={letter}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                  }}
                >
                  <BeePill
                    letter={letter}
                    size={HEX_PILL}
                    onTap={() => onPillTap(letter)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* CurrentWord strip + Flash overlay */}
        <div style={{ position: "relative", width: "100%" }}>
          <CurrentWord
            word={currentWord}
            hint="Tap or slide to spell"
            tileSize={32}
            stripHeight={52}
            availableWidth={350}
            onTileTap={removeAt}
          />
          {flash && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 5,
              }}
              aria-live="polite"
            >
              <PhoneBeeFlashToast flash={flash} />
            </div>
          )}
        </div>

        {/* Action row — Shuffle / Clear / Submit */}
        <div
          style={{
            display: "flex",
            gap: space.x2,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Button
            kind="secondary"
            size="sm"
            onClick={() => {
              playUiTap();
              shuffleOuter();
            }}
            icon={<span>⇅</span>}
            muted
          >
            Shuffle
          </Button>
          <Button
            kind="ghost"
            size="sm"
            onClick={() => {
              playUiTap();
              clearWord();
            }}
            disabled={currentWord.length === 0}
            muted
          >
            ↺ Clear
          </Button>
          <Button
            kind="primary"
            size="sm"
            onClick={submit}
            disabled={currentWord.length === 0}
            muted
          >
            Submit
          </Button>
        </div>

        {/* Best scores — collapsed compact strip; tap to expand the device-wide top 10. */}
        <BestScoresCard
          entries={adaptBeeEntries(topScores)}
          currentPlayerName={currentUser}
          liveScore={score > 0 ? score : undefined}
        />

        {/* Found-words list — fills remaining vertical space, scrolls internally */}
        <FoundList
          title="Found"
          count={foundWords.length}
          columns={3}
          words={[...foundWords].sort()}
        />
      </div>
    </PhoneShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface PhoneBeeFlashToastProps {
  readonly flash: Flash;
}

function PhoneBeeFlashToast({ flash }: PhoneBeeFlashToastProps): JSX.Element {
  if (flash.kind === "added") {
    return <Toast kind="success" title={`${flash.word} · +${flash.points}`} />;
  }
  if (flash.kind === "duplicate") {
    return <Toast kind="warn" title={`${flash.word} — already found`} />;
  }
  return <Toast kind="error" title={flash.word} sub={flash.reason} />;
}

// Re-warm the pangram cache on module load (matches desktop belt-and-suspenders).
void enumerateSevenLetterPangrams;
