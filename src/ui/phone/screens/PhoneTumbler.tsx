import { useEffect, useMemo, useRef, useState } from "react";
import {
  MIN_TUMBLER_WORD_LENGTH,
  TUMBLER_DURATION_MS,
  drawTumblerLetters,
  scoreTumblerWord,
  validateTumblerWord,
} from "../../../engine/games/tumbler.js";
import { createPrng } from "../../../engine/prng.js";
import type { Letter } from "../../../engine/types.js";
import { useGameStore } from "../../../store/gameStore.js";
import { playError, playPlace, playRecall, playSuccess, playUiTap } from "../../../audio/sounds.js";
import { tokens } from "../../tokens.js";
import { BigNumber } from "../../components/BigNumber.js";
import { Button } from "../../components/Button.js";
import { CurrentWord } from "../../components/CurrentWord.js";
import { FoundList } from "../../components/FoundList.js";
import { Tile } from "../../components/Tile.js";
import { Toast } from "../../components/Toast.js";
import { PhoneShell } from "../PhoneShell.js";
import { PhoneTopBar } from "../components/PhoneTopBar.js";

type Flash =
  | { kind: "added"; word: string; points: number }
  | { kind: "duplicate"; word: string }
  | { kind: "invalid"; word: string; reason: string };

const FLASH_DURATION_MS = 1200;
// 52 px — comfortably tappable on a 390 px phone, above the 44 px tap-min.
const RACK_TILE_SIZE = 52;

/**
 * Phone portrait Tumbler screen.
 *
 * Single-column layout for 390×844 portrait:
 *   PhoneTopBar   — back to Home, title "Tumbler"
 *   Header row    — Time (BigNumber) + Score (BigNumber) + Restart
 *   Rack          — 7 letter pills, two rows (3+4)
 *   CurrentWord   — live word strip with tap-to-remove
 *   Flash overlay — success / duplicate / invalid toast
 *   Action row    — Shuffle / Clear / Submit
 *   FoundList     — scrolling found-words card, fills remaining space
 *
 * All store wiring (timer, pause-on-blur, scoring, submit, handoff to
 * tumbler_end) is copied verbatim from the desktop TumblerScreen so
 * both screens are in parity.
 */
export function PhoneTumbler(): JSX.Element | null {
  const dictionary = useGameStore((s) => s.dictionary);
  const setScreen = useGameStore((s) => s.setScreen);
  const goHome = useGameStore((s) => s.goHome);

  const [seed, setSeed] = useState(() => Date.now() & 0x7fffffff);
  const rack = useMemo(() => drawTumblerLetters(createPrng(seed)), [seed]);

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

  const startedRef = useRef(false);
  const remainingMsRef = useRef(TUMBLER_DURATION_MS);
  const startedAtRef = useRef<number | null>(null);

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

  // Countdown — 100 ms tick.
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
      <PhoneShell top={<PhoneTopBar title="Tumbler" onBack={goHome} backLabel="Home" />}>
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <p>Loading dictionary…</p>
        </div>
      </PhoneShell>
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
      if (order.length <= 1) return order;
      return [...order.slice(1), order[0]!];
    });
  };

  const clearWord = (): void => {
    if (input.length === 0) return;
    playUiTap();
    setInput("");
  };

  const removeAt = (i: number): void => {
    if (i < 0 || i >= input.length) return;
    setInput(input.slice(0, i) + input.slice(i + 1));
    playRecall();
  };

  const secondsLeft = (timeLeftMs / 1000).toFixed(1);
  const timerTone = timeLeftMs <= 10_000 && started ? "warn" : "ink";

  const { color, space, font, size, weight } = tokens;

  return (
    <PhoneShell top={<PhoneTopBar title="Tumbler" onBack={goHome} backLabel="Home" />}>
      {/* Pinned column — same discipline as desktop TumblerScreen */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: space.x2,
          padding: `${space.x3}px ${space.x4}px ${space.x3}px`,
        }}
      >
        {/* Time + Score readouts */}
        <div
          style={{
            display: "flex",
            gap: space.x3,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BigNumber value={`${secondsLeft}s`} label="Time" tone={timerTone} compact width={100} />
          <BigNumber value={score} label="Score" tone="brown" compact width={100} />
        </div>

        {/* Restart — compact inline button */}
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
            fontSize: size.caption,
            fontWeight: weight.med,
            cursor: "pointer",
            touchAction: "manipulation",
            opacity: 0.85,
            alignSelf: "center",
          }}
        >
          ↻ Restart
        </button>

        {/* Rack — two rows: 4 top, 3 bottom (phone-friendly distribution) */}
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
          {[rackOrder.slice(0, 4), rackOrder.slice(4, 7)].map((row, rowIdx) => (
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

        {/* CurrentWord strip + Flash overlay */}
        <div style={{ position: "relative", width: "100%" }}>
          <CurrentWord
            word={input}
            hint={started ? "Tap a letter to extend the word" : "Tap a letter to start"}
            tileSize={34}
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
              <PhoneFlashToast flash={flash} />
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

        {/* Found-words list — fills remaining vertical space, scrolls internally */}
        <FoundList
          title={started ? "Found this round" : "Found"}
          words={foundWords}
          count={foundWords.length}
          columns={3}
        />
      </div>
    </PhoneShell>
  );
}

interface PhoneFlashToastProps {
  readonly flash: Flash;
}

function PhoneFlashToast({ flash }: PhoneFlashToastProps): JSX.Element {
  if (flash.kind === "added") {
    return <Toast kind="success" title={`${flash.word} · +${flash.points}`} />;
  }
  if (flash.kind === "duplicate") {
    return <Toast kind="warn" title={`${flash.word} — already found`} />;
  }
  return <Toast kind="error" title={flash.word} sub={flash.reason} />;
}
