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
import { playError, playPlace, playSuccess, playUiTap } from "../../audio/sounds.js";
import { tokens } from "../tokens.js";
import { BackPill } from "../components/BackPill.js";
import { BigNumber } from "../components/BigNumber.js";
import { Button } from "../components/Button.js";
import { CurrentWord } from "../components/CurrentWord.js";
import { FoundList } from "../components/FoundList.js";
import { SectionLabel } from "../components/SectionLabel.js";
import { Surface } from "../components/Surface.js";
import { Tagline } from "../components/Tagline.js";
import { Tile } from "../components/Tile.js";
import { Toast } from "../components/Toast.js";
import { UserChip } from "../components/UserChip.js";

type Flash =
  | { kind: "added"; word: string; points: number }
  | { kind: "duplicate"; word: string }
  | { kind: "invalid"; word: string; reason: string };

const FLASH_DURATION_MS = 1200;
const RACK_TILE_SIZE = 84; // handoff: rack-first screen, larger tile

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
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);

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
      setScreen({ kind: "tumbler_end", score, foundWords });
    }
  }, [started, timeLeftMs, score, foundWords, setScreen]);

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

  const secondsLeft = (timeLeftMs / 1000).toFixed(1);
  const timerTone = timeLeftMs <= 10_000 && started ? "warn" : "ink";

  const { color, space, font, size, weight } = tokens;

  return (
    <Surface padding={0}>
      <BackPill onClick={goHome} />
      {currentUser && (
        <UserChip name={currentUser} onClick={() => setCurrentUser(currentUser)} />
      )}

      <div
        // Pin the screen body to the viewport so the action row at the
        // bottom of the left column never falls off the edge — the rack
        // tiles and Submit are essential touch targets, not optional
        // scroll-into-view content.
        // Top padding clears the BackPill (top:24 + height 44 = 68 bottom)
        // and the UserChip with a little safety margin.
        style={{
          height: "100dvh",
          maxHeight: "100dvh",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: space.x8,
          padding: `${space.x16 + 16}px ${space.x10}px ${space.x4}px`,
          maxWidth: 1240,
          margin: "0 auto",
          width: "100%",
          alignContent: "start",
        }}
      >
        {/* Left — play area. Pinned height so the action row stays in
            view; the rack + buttons live at the bottom via margin-top:
            auto on their wrapper. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: space.x4,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: space.x4,
            }}
          >
            <div>
              <Tagline>Solo mode</Tagline>
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
                Tumbler
              </h1>
            </div>
            <div style={{ display: "flex", gap: space.x3, alignItems: "center" }}>
              <BigNumber value={`${secondsLeft}s`} label="Time" tone={timerTone} />
              <BigNumber value={score} label="Score" tone="brown" />
              {started && (
                <Button
                  kind="ghost"
                  size="sm"
                  onClick={() => {
                    playUiTap();
                    restartGame();
                  }}
                  muted
                  ariaLabel="Restart round"
                >
                  ↻ Restart
                </Button>
              )}
            </div>
          </header>

          <CurrentWord
            word={input}
            hint={started ? "Tap a letter to extend the word" : "Tap a letter to start"}
          />

          <div
            style={{ minHeight: 36, display: "flex", justifyContent: "center" }}
            aria-live="polite"
          >
            {flash && <FlashToast flash={flash} />}
          </div>

          {/* Rack — using Tile primitives directly because Tumbler is
              tap-only (no drag/drop) and the engine Rack expects engine
              Tile objects, not raw letters. marginTop: auto anchors the
              rack + action row to the bottom of the play column. */}
          <div style={{ display: "flex", flexDirection: "column", gap: space.x3, marginTop: "auto" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <Tagline>Your tiles · tap to compose</Tagline>
              <span style={{ fontSize: size.caption, color: color.inkSoft }}>
                Score grows with word length
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: space.x3,
                padding: `${space.x3}px ${space.x4}px`,
                background: color.brown,
                borderRadius: tokens.radius.card,
                boxShadow: `inset 0 2px 6px rgba(0,0,0,.25), ${tokens.shadow.card}`,
              }}
            >
              {rackOrder.map((rackIndex) => {
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
            {/* Action row — 3 buttons per the handoff: Shuffle / Clear /
                Submit. The mid-round Restart lives next to the score
                BigNumber when `started` so users don't lose their place
                if they hit it accidentally — see the header below. */}
            <div style={{ display: "flex", gap: space.x3, flexWrap: "wrap" }}>
              <Button kind="secondary" onClick={shuffleRack} icon={<span>⇅</span>} muted>
                Shuffle
              </Button>
              <Button kind="ghost" onClick={clearWord} disabled={input.length === 0} muted>
                ↺ Clear
              </Button>
              <div style={{ flex: 1, minWidth: space.x4 }} />
              <Button
                kind="primary"
                onClick={handleSubmit}
                disabled={timeLeftMs <= 0 || input.length === 0}
                muted
              >
                Submit
              </Button>
            </div>
          </div>
        </div>

        {/* Right — found words + personal best (during play) OR leaderboard
            (pre-game). overflow-y: auto so a long word list never pushes
            the column off the bottom of the screen. */}
        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: space.x4,
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          {started ? (
            <FoundList
              title="Found this round"
              words={foundWords}
              count={foundWords.length}
              columns={3}
            />
          ) : (
            <LeaderboardPanel entries={leaderboard} />
          )}

          <PersonalBestCard best={personalBest} current={score} started={started} />
        </aside>
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

interface LeaderboardPanelProps {
  readonly entries: ReadonlyArray<LeaderboardEntry>;
}

function LeaderboardPanel({ entries }: LeaderboardPanelProps): JSX.Element {
  const { color, radius, shadow, space, font, size, weight } = tokens;
  return (
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
      <SectionLabel style={{ marginBottom: 0 }}>Top scores</SectionLabel>
      {entries.length === 0 ? (
        <span style={{ fontSize: size.caption, color: color.inkSoft }}>
          No scores yet — tap a letter to start the 60-second sprint.
        </span>
      ) : (
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {entries.map((entry, i) => (
            <li
              key={`${entry.name}-${entry.timestamp}`}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto",
                gap: space.x3,
                alignItems: "center",
                padding: "6px 0",
                borderBottom:
                  i === entries.length - 1 ? "none" : `1px dashed ${color.creamDark}`,
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
                  fontWeight: weight.med,
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
          ))}
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
