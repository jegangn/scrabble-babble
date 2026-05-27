import { useEffect, useState } from "react";
import {
  getTumblerBest,
  getTumblerLeaderboard,
  recordTumblerScore,
  setTumblerBest,
  type LeaderboardEntry,
} from "../../../storage/solo-storage.js";
import { useGameStore } from "../../../store/gameStore.js";
import { tokens } from "../../tokens.js";
import { formatTumblerDate } from "../../utils/best-entries.js";
import { Button } from "../../components/Button.js";
import { CompareBar } from "../../components/CompareBar.js";
import { FooterMark } from "../../components/FooterMark.js";
import { PossibleWordsCard } from "../../components/PossibleWordsCard.js";
import { SectionLabel } from "../../components/SectionLabel.js";
import { PhoneShell } from "../PhoneShell.js";
import { PhoneTopBar } from "../components/PhoneTopBar.js";

/**
 * Phone portrait Tumbler end screen.
 *
 * Single-column layout for 390×844 portrait, pinned to `var(--app-h)`:
 *   PhoneTopBar      — title "Tumbler", no back (round is over)
 *   Scrollable area  — score header (+ new-best treatment), CompareBar,
 *                      "All possible words" PossibleWordsCard (tints +
 *                      ✓-marks the player's finds), leaderboard card, footer
 *   Action strip     — flexShrink:0 pinned at the bottom outside the
 *                      scroll area so Restart + Play again are ALWAYS
 *                      reachable regardless of list length.
 *
 * Mirrors the persistence logic (best + leaderboard) from the desktop
 * TumblerEndScreen exactly; only the layout changes (2-column → 1-column).
 */
export function PhoneTumblerEnd(): JSX.Element | null {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const goHome = useGameStore((s) => s.goHome);
  const currentUser = useGameStore((s) => s.currentUser);
  const dictionary = useGameStore((s) => s.dictionary);

  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<ReadonlyArray<LeaderboardEntry>>([]);

  // Same persistence effect as desktop — runs once per round score.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.kind === "tumbler_end" ? screen.score : 0]);

  if (screen.kind !== "tumbler_end") return null;

  const { score, foundWords, rack } = screen;
  const isNewBest = previousBest !== null && score > previousBest;
  const delta = previousBest === null ? 0 : score - previousBest;

  const { color, radius, shadow, space, font, size, weight } = tokens;

  const compareMax = 250;

  return (
    <PhoneShell
      top={<PhoneTopBar title="Tumbler" onBack={goHome} backLabel="Home" />}
    >
      {/* Scrollable content — fills remaining height, scrolls when needed */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: `${space.x4}px ${space.x4}px ${space.x3}px`,
          gap: space.x4,
        }}
      >
        {/* Score header */}
        <div>
          <span
            style={{
              display: "inline-block",
              fontSize: size.micro,
              fontWeight: weight.med,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: isNewBest ? color.success : color.inkSoft,
              marginBottom: space.x2,
            }}
          >
            {isNewBest ? "Round complete · New best" : "Round complete"}
          </span>
          <h2
            style={{
              margin: 0,
              fontFamily: font.serif,
              fontWeight: weight.heavy,
              fontSize: size.h1,
              lineHeight: 1,
              letterSpacing: "-0.025em",
              color: color.brown,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {score}
          </h2>
          <p
            style={{
              margin: `${space.x2}px 0 0`,
              fontSize: size.body,
              color: color.inkSoft,
              lineHeight: 1.5,
            }}
          >
            {isNewBest && previousBest !== null && (
              <>
                Up{" "}
                <strong style={{ color: color.success, fontWeight: weight.med }}>
                  +{delta}
                </strong>{" "}
                from your previous best of {previousBest}.{" "}
              </>
            )}
            {!isNewBest && previousBest !== null && previousBest > 0 && (
              <>
                Personal best{" "}
                <strong style={{ color: color.ink, fontWeight: weight.med }}>
                  {previousBest}
                </strong>{" "}
                still stands.{" "}
              </>
            )}
            {foundWords.length === 1
              ? "One word found."
              : `${foundWords.length} words found.`}
          </p>
        </div>

        {/* CompareBar — only when there is a previous best to compare */}
        {previousBest !== null && previousBest > 0 && (
          <div
            style={{
              padding: space.x4,
              background: color.paper,
              border: `1.5px solid ${color.stroke}`,
              borderRadius: radius.card,
              boxShadow: shadow.card,
              display: "flex",
              flexDirection: "column",
              gap: space.x3,
            }}
          >
            <SectionLabel style={{ margin: 0 }}>Best vs this round</SectionLabel>
            <CompareBar a={previousBest} b={score} max={compareMax} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: size.caption,
                color: color.inkSoft,
              }}
            >
              <span>Prev best · {previousBest}</span>
              <span
                style={{
                  color: isNewBest ? color.success : color.inkSoft,
                  fontWeight: weight.med,
                }}
              >
                This round · {score}
              </span>
            </div>
          </div>
        )}

        {/* All possible words — single word list, fills the available height
            inside the scrollable middle column. Tints + ✓-marks the player's
            finds, so a separate "Words you found" list is redundant. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            // Give it a comfortable minimum on a tall phone (so leaderboard
            // doesn't crowd it); no upper cap — the outer middle column has
            // overflow-y:auto so any extra height just scrolls.
            minHeight: 260,
            flex: "1 0 auto",
          }}
        >
          <PossibleWordsCard rack={rack} dictionary={dictionary} foundWords={foundWords} />
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
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
            <SectionLabel style={{ margin: 0 }}>Top scores</SectionLabel>
            <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {leaderboard.slice(0, 5).map((entry, i) => {
                const isYou =
                  currentUser !== null &&
                  entry.name === currentUser &&
                  entry.score === score &&
                  Math.abs(entry.timestamp - Date.now()) < 60_000;
                return (
                  <li
                    key={`${entry.name}-${entry.timestamp}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto auto",
                      gap: space.x3,
                      alignItems: "center",
                      padding: "6px 4px",
                      borderBottom:
                        i === Math.min(leaderboard.length, 5) - 1
                          ? "none"
                          : `1px dashed ${color.creamDark}`,
                      fontSize: size.body,
                      background: isYou
                        ? `color-mix(in oklab, ${color.successBg} 60%, transparent)`
                        : "transparent",
                      borderRadius: 6,
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
                      {formatTumblerDate(entry.timestamp)}
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
          </div>
        )}

        <FooterMark style={{ paddingBottom: space.x2 }} />
      </div>

      {/* Action strip — pinned outside the scroll area so buttons are always reachable */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          gap: space.x3,
          padding: `${space.x3}px ${space.x4}px ${space.x4}px`,
          borderTop: `1px solid ${color.strokeSoft}`,
          background: color.cream,
        }}
      >
        <Button
          kind="secondary"
          size="md"
          style={{ flex: 1 }}
          onClick={() => setScreen({ kind: "tumbler" })}
        >
          Restart
        </Button>
        <Button
          kind="primary"
          size="md"
          style={{ flex: 1 }}
          onClick={() => setScreen({ kind: "tumbler" })}
        >
          Play again
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M3 8a5 5 0 1 0 1.7-3.8M3 3v3h3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </div>
    </PhoneShell>
  );
}
