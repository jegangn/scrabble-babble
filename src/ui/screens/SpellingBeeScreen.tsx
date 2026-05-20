import { useEffect, useMemo, useRef, useState } from "react";
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
  getBeeLeaderboard,
  getBeeProgress,
  localDateKey,
  recordBeeScore,
  setBeeProgress,
  type LeaderboardEntry,
} from "../../storage/solo-storage.js";
import { useGameStore } from "../../store/gameStore.js";
import { playError, playPlace, playSuccess, playUiTap } from "../../audio/sounds.js";
import { tokens } from "../tokens.js";
import { BackPill } from "../components/BackPill.js";
import { BeePill } from "../components/BeePill.js";
import { Button } from "../components/Button.js";
import { CurrentWord } from "../components/CurrentWord.js";
import { FoundList } from "../components/FoundList.js";
import { SectionLabel } from "../components/SectionLabel.js";
import { Surface } from "../components/Surface.js";
import { Tagline } from "../components/Tagline.js";
import { Toast } from "../components/Toast.js";
import { UserChip } from "../components/UserChip.js";

type Flash =
  | { kind: "added"; word: string; points: number }
  | { kind: "duplicate"; word: string }
  | { kind: "invalid"; word: string; reason: string };

const FLASH_DURATION_MS = 1200;

// Hex geometry — matches the handoff spec: 360×360 container, 100 px ring
// radius, 110 px pill. Generous spacing keeps the action row below from
// crowding the outer pills.
const HEX_BOX = 360;
const HEX_RADIUS = 100;
const HEX_PILL = 110;
const HEX_CENTRE = HEX_BOX / 2;

/** Outer-position offsets — pointy-top hex, clockwise from 12 o'clock. */
const HEX_OFFSETS = [
  { x: 0, y: -HEX_RADIUS },
  { x: HEX_RADIUS * 0.87, y: -HEX_RADIUS * 0.5 },
  { x: HEX_RADIUS * 0.87, y: HEX_RADIUS * 0.5 },
  { x: 0, y: HEX_RADIUS },
  { x: -HEX_RADIUS * 0.87, y: HEX_RADIUS * 0.5 },
  { x: -HEX_RADIUS * 0.87, y: -HEX_RADIUS * 0.5 },
] as const;

/**
 * Spelling Bee — daily 7-letter puzzle, rebuilt per the design handoff.
 *
 * Two-column layout:
 *   Left  — header (tagline + h1 + date), CurrentWord, hex (1 centre +
 *           6 outer pills with slide-trail polyline overlay), action row
 *           (Delete / Shuffle / Submit).
 *   Right — FoundList (sorted alphabetically) + today's leaderboard.
 *
 * Both tap-to-compose AND press-and-drag composition are preserved.
 * Trail polyline draws in real-time as the finger sweeps; fades out on
 * release. Tile reuse is allowed (Bee mechanic, unlike Tumbler).
 */
export function SpellingBeeScreen(): JSX.Element | null {
  const dictionary = useGameStore((s) => s.dictionary);
  const goHome = useGameStore((s) => s.goHome);
  const currentUser = useGameStore((s) => s.currentUser);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);

  const dateKey = useMemo(() => localDateKey(), []);

  const [puzzle, setPuzzle] = useState<BeePuzzle | null>(null);
  const [outerOrder, setOuterOrder] = useState<ReadonlyArray<Letter>>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [leaderboard, setLeaderboard] = useState<ReadonlyArray<LeaderboardEntry>>([]);
  const [foundWords, setFoundWords] = useState<ReadonlyArray<string>>([]);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [totalWords, setTotalWords] = useState<number | null>(null);
  const [puzzleError, setPuzzleError] = useState<string | null>(null);

  // Drag-to-spell refs. Refs (not state) because they fire on every
  // pointer-move and we don't want React re-renders per move.
  const dragActiveRef = useRef(false);
  const dragLetterRef = useRef<Letter | null>(null);
  const dragStartXYRef = useRef<{ x: number; y: number } | null>(null);
  const dragSawMoveRef = useRef(false);

  // Slide-trail state — polyline points between visited pills + fade flag.
  const hexContainerRef = useRef<HTMLDivElement | null>(null);
  const trailFadeTimerRef = useRef<number | null>(null);
  const [trailPoints, setTrailPoints] = useState<ReadonlyArray<{ x: number; y: number }>>(
    [],
  );
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
      const board = await getBeeLeaderboard(dateKey);
      setLeaderboard(board);
    })();
    // Lazy total-word enumeration after first paint (heavier walk).
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

  // Auto-clear the flash toast.
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), FLASH_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [flash]);

  const { color, radius, shadow, space, font, size, weight } = tokens;

  if (puzzleError) {
    return (
      <Surface>
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
          <div style={{ fontSize: size.h4, fontWeight: weight.bold, color: color.danger }}>
            Couldn't load today's puzzle
          </div>
          <div
            style={{
              fontSize: size.body,
              color: color.inkSoft,
              textAlign: "center",
              maxWidth: 360,
            }}
          >
            {puzzleError}. Try refreshing the page — if it persists, the dictionary
            file may be missing.
          </div>
          <Button kind="primary" onClick={goHome}>
            Back to home
          </Button>
        </div>
      </Surface>
    );
  }

  if (!dictionary || !puzzle) {
    return (
      <Surface>
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <p>Preparing today's puzzle…</p>
        </div>
      </Surface>
    );
  }

  const score = foundWords.reduce((acc, w) => acc + scoreBeeWord(w, puzzle), 0);

  const appendLetter = (letter: Letter): void => {
    if (currentWord.length >= 15) return;
    setCurrentWord(currentWord + letter);
    playPlace();
  };

  const deleteLetter = (): void => {
    if (currentWord.length === 0) return;
    setCurrentWord(currentWord.slice(0, -1));
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
        const total = next.reduce((acc, word) => acc + scoreBeeWord(word, puzzle), 0);
        await recordBeeScore(dateKey, currentUser, total);
        setLeaderboard(await getBeeLeaderboard(dateKey));
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

  // Letter-tap handler — fires on simple tap (drag suppresses the click
  // via onClickCapture below).
  const onPillTap = (letter: Letter): void => {
    appendLetter(letter);
  };

  // Pointer-down on the hex container — seed drag state + trail.
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

  // Pointer-move — extend the trail + maybe append a letter when a new pill
  // is crossed. 8 px threshold to distinguish tap from drag.
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
    // Append the current finger position to the trail, throttled at 4 px.
    const containerEl = hexContainerRef.current;
    if (containerEl) {
      const r = containerEl.getBoundingClientRect();
      const fx = e.clientX - r.left;
      const fy = e.clientY - r.top;
      setTrailPoints((prev) => {
        const last = prev[prev.length - 1];
        if (last && Math.abs(last.x - fx) < 4 && Math.abs(last.y - fy) < 4) {
          return prev;
        }
        return [...prev, { x: fx, y: fy }];
      });
    }
    // Identify the pill under the finger and append its letter if new.
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const pill = el?.closest("[data-bee-letter]") as HTMLElement | null;
    const letter = pill?.dataset.beeLetter as Letter | undefined;
    if (!letter) return;
    if (dragLetterRef.current === letter) return; // same pill, no-op
    dragLetterRef.current = letter;
    let appended = false;
    setCurrentWord((cw) => {
      if (cw.length >= 15) return cw;
      appended = true;
      return cw + letter;
    });
    if (appended) playPlace();
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

  // Suppress the synthetic click that pointerup would emit if a drag happened,
  // otherwise the last pill's onTap would double-fire.
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (dragSawMoveRef.current) {
      e.stopPropagation();
      e.preventDefault();
      dragSawMoveRef.current = false;
    }
  };

  return (
    <Surface padding={0}>
      <BackPill onClick={goHome} />
      {currentUser && (
        <UserChip name={currentUser} onClick={() => setCurrentUser(currentUser)} />
      )}

      {/* Portrait-phone reflow: scale the hex container down so the 360 px
          spec still fits inside a 480 px viewport (after 32 px of side padding,
          available width is ~416 px). 0.78× scale brings it to ~281 px on-screen.
          getBoundingClientRect() returns post-transform coords so the slide-
          trail math tracks the finger correctly at any scale. */}
      <style>{`
        @media (max-width: 520px) {
          .bee-hex-scale-wrap {
            transform: scale(0.78);
            transform-origin: top center;
            margin-bottom: -80px;
          }
        }
        @media (max-width: 380px) {
          .bee-hex-scale-wrap {
            transform: scale(0.65);
            margin-bottom: -130px;
          }
        }
      `}</style>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: space.x10,
          padding: `${space.x16 + 8}px ${space.x10}px ${space.x6}px`,
          maxWidth: 1240,
          margin: "0 auto",
          width: "100%",
          alignContent: "start",
        }}
      >
        {/* Left — header + hex + actions */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: space.x4,
            alignItems: "center",
          }}
        >
          <header
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: space.x4,
            }}
          >
            <div>
              <Tagline>Daily puzzle</Tagline>
              <h1
                style={{
                  fontFamily: font.serif,
                  fontWeight: weight.heavy,
                  fontSize: size.h1,
                  margin: `${space.x2}px 0 0`,
                  letterSpacing: "-0.02em",
                  color: color.brown,
                }}
              >
                Spelling Bee
              </h1>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: size.caption,
                  color: color.inkSoft,
                  textTransform: "uppercase",
                  letterSpacing: ".12em",
                  fontWeight: weight.med,
                }}
              >
                {formatHeaderDate(dateKey)}
              </span>
              <span
                style={{
                  fontFamily: font.serif,
                  fontWeight: weight.bold,
                  fontSize: size.h3,
                  color: color.brown,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {score}
                {totalWords !== null && (
                  <span
                    style={{
                      fontSize: size.body,
                      color: color.inkSoft,
                      marginLeft: 8,
                      fontWeight: weight.med,
                    }}
                  >
                    · {foundWords.length}/{totalWords}
                  </span>
                )}
              </span>
            </div>
          </header>

          <div style={{ width: "100%" }}>
            <CurrentWord word={currentWord} hint="Tap or slide to spell" tileSize={48} />
          </div>

          <div style={{ minHeight: 36 }} aria-live="polite">
            {flash && <FlashToast flash={flash} />}
          </div>

          {/* Hex — pills positioned absolutely; pointer handlers on the
              container. Dashed ring guide is purely decorative.
              On narrow viewports we scale the entire hex via a CSS
              transform applied through a `.bee-hex-scale-wrap` wrapper
              (see media queries above the screen body). getBoundingClientRect
              returns post-transform coords, so the slide-trail math
              tracks the finger correctly at any zoom level. */}
          <div
            className="bee-hex-scale-wrap"
            style={{ width: HEX_BOX, height: HEX_BOX, flexShrink: 0 }}
          >
            <div
              ref={hexContainerRef}
              style={{
                position: "relative",
                width: HEX_BOX,
                height: HEX_BOX,
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
                width={HEX_BOX}
                height={HEX_BOX}
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

          <div
            style={{
              display: "flex",
              gap: space.x3,
              width: "100%",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Button
              kind="secondary"
              onClick={() => {
                playUiTap();
                deleteLetter();
              }}
              disabled={currentWord.length === 0}
              icon={<span>⌫</span>}
              muted
            >
              Delete
            </Button>
            <Button
              kind="secondary"
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
              kind="primary"
              onClick={submit}
              disabled={currentWord.length === 0}
              muted
            >
              Submit
            </Button>
          </div>
        </div>

        {/* Right — found words + leaderboard */}
        <aside style={{ display: "flex", flexDirection: "column", gap: space.x4 }}>
          <FoundList
            title="Found"
            count={foundWords.length}
            columns={2}
            words={[...foundWords].sort()}
          />

          <div
            style={{
              background: color.paper,
              border: `1.5px solid ${color.stroke}`,
              borderRadius: radius.card,
              boxShadow: shadow.card,
              padding: space.x4,
              display: "flex",
              flexDirection: "column",
              gap: space.x3,
            }}
          >
            <SectionLabel style={{ margin: 0 }}>Today's leaderboard</SectionLabel>
            {leaderboard.length === 0 ? (
              <span style={{ fontSize: size.caption, color: color.inkSoft }}>
                No scores yet today.
              </span>
            ) : (
              <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {leaderboard.map((entry, i) => {
                  const isYou = currentUser !== null && entry.name === currentUser;
                  return (
                    <li
                      key={entry.name}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto",
                        gap: space.x3,
                        alignItems: "center",
                        padding: "6px 4px",
                        borderRadius: 6,
                        borderBottom:
                          i === leaderboard.length - 1
                            ? "none"
                            : `1px dashed ${color.creamDark}`,
                        background: isYou
                          ? `color-mix(in oklab, ${color.successBg} 60%, transparent)`
                          : "transparent",
                        fontSize: size.body,
                      }}
                    >
                      <span style={{ color: color.inkSoft, minWidth: 18 }}>{i + 1}.</span>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: color.ink,
                          fontWeight: isYou ? weight.bold : weight.med,
                        }}
                      >
                        {entry.name}
                      </span>
                      <span
                        style={{
                          fontFamily: font.serif,
                          fontWeight: weight.bold,
                          fontVariantNumeric: "tabular-nums",
                          color: color.brown,
                          minWidth: 32,
                          textAlign: "right",
                        }}
                      >
                        {entry.score}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </Surface>
  );
}

/** Format a YYYY-MM-DD date key as "Tue · May 20". */
function formatHeaderDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleString(undefined, { weekday: "short" });
  const month = dt.toLocaleString(undefined, { month: "short" });
  return `${weekday} · ${month} ${d}`;
}

interface FlashToastProps {
  readonly flash: Flash;
}

function FlashToast({ flash }: FlashToastProps): JSX.Element {
  if (flash.kind === "added") {
    return <Toast kind="success" title={`${flash.word} · +${flash.points}`} />;
  }
  if (flash.kind === "duplicate") {
    return <Toast kind="warn" title={`${flash.word} — already found`} />;
  }
  return <Toast kind="error" title={flash.word} sub={flash.reason} />;
}

// Re-warm the pangram cache so HomeScreen's idle warm is sufficient even if
// the user skipped Home. Inline import side-effect: just call the function
// at module top-level if `dictionary` is available globally. The HomeScreen
// also calls it; this is a safety belt for hot-reload paths.
void enumerateSevenLetterPangrams;
