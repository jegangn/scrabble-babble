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
  getTumblerBest,
  type LeaderboardEntry,
} from "../../storage/solo-storage.js";
import { useGameStore } from "../../store/gameStore.js";
import { playError, playPlace, playRecall, playSuccess, playUiTap } from "../../audio/sounds.js";
import { tokens } from "../tokens.js";
import { BackPill } from "../components/BackPill.js";
import { BigNumber } from "../components/BigNumber.js";
import { Button } from "../components/Button.js";
import { CurrentWord } from "../components/CurrentWord.js";
import { FoundList } from "../components/FoundList.js";
import { SectionLabel } from "../components/SectionLabel.js";
import { Surface } from "../components/Surface.js";
import { Tile } from "../components/Tile.js";
import { Toast } from "../components/Toast.js";
import { UserChip } from "../components/UserChip.js";

type Flash =
  | { kind: "added"; word: string; points: number }
  | { kind: "duplicate"; word: string }
  | { kind: "invalid"; word: string; reason: string };

const FLASH_DURATION_MS = 1200;
// Compact rack tile — smaller than the 84 px handoff spec so the page
// fits on iPad without scrolling. 60 px is still well above the 44 px
// tap-min and reads comfortably for the older user.
const RACK_TILE_SIZE = 60;

/**
 * Tumbler — 60-second word-finding sprint, rebuilt per the design handoff.
 *
 * Two-column iPad layout:
 *   Left  — Header (tagline + h1 + BigNumber timer/score) → CurrentWord
 *           strip → Toast flash → Rack of 7 cream tiles → action row
 *           (Shuffle / Clear / Submit)
 *   Right — FoundList (during play) OR Top-scores leaderboard
 *           (pre-game) + Personal-best card
 *
 * The single-column reflow at narrow widths is the handoff's
 * documented pattern: sidebar collapses below.
 */
export function TumblerScreen(): JSX.Element | null {
  const dictionary = useGameStore((s) => s.dictionary);
  const setScreen = useGameStore((s) => s.setScreen);
  const goHome = useGameStore((s) => s.goHome);
  const currentUser = useGameStore((s) => s.currentUser);

  // Seed lives in state so Restart can mint a fresh one without losing
  // the leaderboard / personal-best loads or any in-flight timers.
  const [seed, setSeed] = useState(() => Date.now() & 0x7fffffff);
  const rack = useMemo(() => drawTumblerLetters(createPrng(seed)), [seed]);

  // Visual shuffle order — the tiles in the rack don't change, just
  // their on-screen positions. Shuffle button rotates by one.
  const [rackOrder, setRackOrder] = useState(() => rack.map((_, i) => i));
  useEffect(() => {
    setRackOrder(rack.map((_, i) => i));
  }, [rack]);

  const [input, setInput] = useState("");
  const [foundWords, setFoundWords] = useState<ReadonlyArray<string>>([]);
  const [score, setScore] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(TUMBLER_DURATION_MS);
  const [started, setStarted] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [leaderboard, setLeaderboard] = useState<ReadonlyArray<LeaderboardEntry>>([]);
  const [personalBest, setPersonalBest] = useState<number>(0);
  const [topScoresExpanded, setTopScoresExpanded] = useState(false);

  // Refs so the visibility handler always sees the latest values.
  const startedRef = useRef(false);
  const remainingMsRef = useRef(TUMBLER_DURATION_MS);
  const startedAtRef = useRef<number | null>(null);

  // Load leaderboard + personal-best on mount.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [board, best] = await Promise.all([getTumblerLeaderboard(), getTumblerBest()]);
      if (cancelled) return;
      setLeaderboard(board);
      setPersonalBest(best);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const restartGame = (): void => {
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

  // Countdown — 100 ms tick. See visibility-change handler below for pause.
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

  // Time-up handoff to end screen.
  useEffect(() => {
    if (started && timeLeftMs <= 0) {
      setScreen({ kind: "tumbler_end", score, foundWords, rack });
    }
  }, [started, timeLeftMs, score, foundWords, rack, setScreen]);

  // Pause-on-blur: bank elapsed time into remainingMsRef when hidden.
  useEffect(() => {
    const onVisibilityChange = (): void => {
      if (!startedRef.current) return;
      if (document.hidden) {
        const start = startedAtRef.current;
        if (start !== null) {
          const elapsed = Date.now() - start;
          remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
          startedAtRef.current = null;
        }
      } else {
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
      <Surface>
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <p>Loading dictionary…</p>
        </div>
      </Surface>
    );
  }

  const handleSubmit = (): void => {
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

  const startTimerIfNeeded = (): void => {
    if (!started) {
      setStarted(true);
      startedRef.current = true;
    }
  };

  const appendLetter = (letter: Letter): void => {
    if (timeLeftMs <= 0) return;
    if (input.length >= 15) return;
    startTimerIfNeeded();
    setInput(input + letter);
    playPlace();
  };

  const shuffleRack = (): void => {
    if (timeLeftMs <= 0) return;
    playUiTap();
    setRackOrder((order) => {
      // Rotate by one — same idiom as the Bee shuffle. Cheap, deterministic,
      // visually satisfying without an animation budget.
      if (order.length <= 1) return order;
      return [...order.slice(1), order[0]!];
    });
  };

  const clearWord = (): void => {
    if (input.length === 0) return;
    playUiTap();
    setInput("");
  };

  /** Remove the letter at a specific index in the current input.
   *  Wired from CurrentWord's tile-tap so the user can pull a letter
   *  out of the middle of the word, not just truncate the end. */
  const removeAt = (i: number): void => {
    if (i < 0 || i >= input.length) return;
    setInput(input.slice(0, i) + input.slice(i + 1));
    playRecall();
  };

  const secondsLeft = (timeLeftMs / 1000).toFixed(1);
  const timerTone = timeLeftMs <= 10_000 && started ? "warn" : "ink";

  const { color, space, font, size, weight } = tokens;

  return (
    <Surface padding={0}>
      <BackPill onClick={goHome} />
      {currentUser && <UserChip name={currentUser} />}

      <div
        // Pinned to viewport — page itself doesn't scroll. Only the
        // bottom "Top scores / Found this round" card has overflow-y
        // so a long leaderboard doesn't push the rack + action row
        // off the screen.
        style={{
          height: "var(--app-h)",
          maxHeight: "var(--app-h)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: space.x2,
          padding: `${space.x12}px ${space.x6}px ${space.x4}px`,
          maxWidth: 720,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Header — title only. Subtitle ("Solo · 60-second sprint") was
            dropped to claw back vertical space on shorter screens. */}
        <header style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <h1
            style={{
              fontFamily: font.serif,
              fontWeight: weight.heavy,
              fontSize: size.h3,
              margin: 0,
              letterSpacing: "-0.02em",
              color: color.brown,
            }}
          >
            Tumbler
          </h1>
        </header>

        {/* Timer + score, side-by-side. Each BigNumber gets a fixed pixel
            width so the timer's box never breathes as the seconds tick
            down — tabular-nums alone isn't enough because a digit dropping
            from "60.0s" to "8.4s" still shrinks the box unless its outer
            width is explicit. */}
        <div style={{ display: "flex", gap: space.x3, alignItems: "center", justifyContent: "center" }}>
          <BigNumber value={`${secondsLeft}s`} label="Time" tone={timerTone} compact width={112} />
          <BigNumber value={score} label="Score" tone="brown" compact width={112} />
        </div>

        {/* Restart — always visible, beneath Time/Score. Compact inline
            button (not the shared Button — which has a 44 px tap-min that
            stacks too much vertical space between Score and the rack)
            with generous horizontal padding to keep the hit area
            comfortable. Negative vertical margins claw back the parent's
            x2 (8 px) flex-gap on each side. */}
        <button
          type="button"
          onClick={() => {
            playUiTap();
            restartGame();
          }}
          aria-label="Restart round"
          style={{
            appearance: "none",
            font: "inherit",
            background: "transparent",
            color: color.brown,
            border: "none",
            padding: "4px 18px",
            marginTop: -space.x2 + 2,
            marginBottom: -space.x2 + 2,
            fontSize: size.caption,
            fontWeight: weight.med,
            cursor: "pointer",
            touchAction: "manipulation",
            opacity: 0.85,
          }}
        >
          ↻ Restart
        </button>

        {/* CurrentWord + Flash overlay — the flash toast renders
            absolutely on top of the strip so its appearance/disappearance
            doesn't push the rack up or down. Input is always cleared
            before a flash fires (handleSubmit), so the strip beneath is
            showing its hint and the overlay covers plain text only. */}
        <div style={{ position: "relative", width: "100%", maxWidth: 480 }}>
          <CurrentWord
            word={input}
            hint={started ? "Tap a letter to extend the word" : "Tap a letter to start"}
            tileSize={36}
            stripHeight={56}
            availableWidth={480}
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
              <FlashToast flash={flash} />
            </div>
          )}
        </div>

        {/* Rack — explicitly two rows: top has the first 3 tiles, bottom
            has the remaining 4 tiles (per user feedback). Splitting on
            rackOrder so shuffle still works correctly. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: space.x2,
            padding: `${space.x2}px ${space.x3}px`,
            background: color.brown,
            borderRadius: tokens.radius.card,
            boxShadow: `inset 0 2px 6px rgba(0,0,0,.25), ${tokens.shadow.card}`,
          }}
        >
          {[rackOrder.slice(0, 3), rackOrder.slice(3, 7)].map((row, rowIdx) => (
            <div
              key={rowIdx}
              style={{
                display: "flex",
                justifyContent: "center",
                gap: space.x2,
              }}
            >
              {row.map((rackIndex) => {
                const letter = rack[rackIndex]!;
                return (
                  <button
                    key={rackIndex}
                    type="button"
                    onClick={() => appendLetter(letter)}
                    disabled={timeLeftMs <= 0}
                    aria-label={`Letter ${letter}`}
                    style={{
                      appearance: "none",
                      font: "inherit",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: timeLeftMs <= 0 ? "not-allowed" : "pointer",
                      touchAction: "manipulation",
                    }}
                  >
                    <Tile letter={letter} size={RACK_TILE_SIZE} variant="cream" />
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Action row — Shuffle / Clear / Submit, centred. */}
        <div style={{ display: "flex", gap: space.x3, justifyContent: "center", flexWrap: "wrap" }}>
          <Button kind="secondary" size="sm" onClick={shuffleRack} icon={<span>⇅</span>} muted>
            Shuffle
          </Button>
          <Button kind="ghost" size="sm" onClick={clearWord} disabled={input.length === 0} muted>
            ↺ Clear
          </Button>
          <Button
            kind="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={timeLeftMs <= 0 || input.length === 0}
            muted
          >
            Submit
          </Button>
        </div>

        {/* Bottom — FoundList (always present, fills space), then the
            compact PersonalBest strip, then the collapsible TopScores
            card. Mirrors the Spelling Bee layout so both solo screens
            read the same. Page itself stays pinned; only the FoundList
            grid and the expanded TopScores list scroll internally. */}
        <div
          style={{
            width: "100%",
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: space.x2,
            marginTop: space.x1,
            overflow: "hidden",
          }}
        >
          <FoundList
            title={started ? "Found this round" : "Found"}
            words={foundWords}
            count={foundWords.length}
            columns={3}
          />
          <PersonalBestCard best={personalBest} current={score} started={started} />
          <TumblerTopScoresCard
            entries={leaderboard}
            expanded={topScoresExpanded}
            currentUser={currentUser}
            onToggle={() => {
              playUiTap();
              setTopScoresExpanded((v) => !v);
            }}
          />
        </div>
      </div>
    </Surface>
  );
}

interface PersonalBestCardProps {
  readonly best: number;
  readonly current: number;
  readonly started: boolean;
}

function PersonalBestCard({ best, current, started }: PersonalBestCardProps): JSX.Element {
  const { color, radius, shadow, space, font, size, weight } = tokens;
  // During play, show the live "vs best" delta. Pre-game, just the best.
  const beating = started && current > best;
  return (
    <div
      style={{
        padding: `${space.x3}px ${space.x4}px`,
        background: color.paper,
        border: `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        boxShadow: shadow.card,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span
          style={{
            fontSize: size.caption,
            color: color.inkSoft,
            textTransform: "uppercase",
            letterSpacing: ".1em",
            fontWeight: weight.med,
          }}
        >
          Personal best
        </span>
        <span
          style={{
            fontFamily: font.serif,
            fontWeight: weight.bold,
            fontSize: size.h4,
            color: beating ? color.success : color.brown,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {best}
        </span>
      </div>
      {beating && (
        <div
          style={{
            marginTop: 4,
            fontSize: size.micro + 1,
            color: color.success,
            fontWeight: weight.med,
          }}
        >
          New high — up {current - best}.
        </div>
      )}
    </div>
  );
}

interface TumblerTopScoresCardProps {
  readonly entries: ReadonlyArray<LeaderboardEntry>;
  readonly expanded: boolean;
  readonly currentUser: string | null;
  readonly onToggle: () => void;
}

/** Collapsible Top-Scores card — same shape as the Spelling Bee version.
 *  Collapsed shows just the header + entry count; tapping expands an
 *  inline scroll region capped at 220 px so the page itself stays
 *  single-screen. */
function TumblerTopScoresCard({
  entries,
  expanded,
  currentUser,
  onToggle,
}: TumblerTopScoresCardProps): JSX.Element {
  const { color, radius, shadow, space, font, size, weight } = tokens;
  return (
    <div
      style={{
        background: color.paper,
        border: `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        boxShadow: shadow.card,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          appearance: "none",
          font: "inherit",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: `${space.x3}px ${space.x4}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.x3,
          touchAction: "manipulation",
          width: "100%",
        }}
      >
        <SectionLabel style={{ margin: 0 }}>Top scores</SectionLabel>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: space.x2,
            fontSize: size.caption,
            color: color.inkSoft,
            fontWeight: weight.med,
          }}
        >
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{entries.length}</span>
          <span aria-hidden style={{ fontSize: size.body, color: color.brown }}>
            {expanded ? "▾" : "▸"}
          </span>
        </span>
      </button>
      {expanded && (
        <ol
          style={{
            listStyle: "none",
            padding: `0 ${space.x4}px ${space.x3}px`,
            margin: 0,
            overflowY: "auto",
            maxHeight: 220,
          }}
        >
          {entries.length === 0 ? (
            <li style={{ fontSize: size.caption, color: color.inkSoft, padding: "6px 0" }}>
              No scores yet — tap a letter to start the 60-second sprint.
            </li>
          ) : (
            entries.map((entry, i) => {
              const isYou = currentUser !== null && entry.name === currentUser;
              return (
                <li
                  key={`${entry.name}-${entry.timestamp}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto auto",
                    gap: space.x3,
                    alignItems: "center",
                    padding: "6px 4px",
                    borderRadius: 6,
                    borderBottom:
                      i === entries.length - 1
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
                      fontSize: size.micro + 1,
                      color: color.inkSoft,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatDate(entry.timestamp)}
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
            })
          )}
        </ol>
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
