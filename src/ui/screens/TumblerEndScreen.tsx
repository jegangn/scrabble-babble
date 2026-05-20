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
import { tokens } from "../tokens.js";
import { BackPill } from "../components/BackPill.js";
import { Button } from "../components/Button.js";
import { CompareBar } from "../components/CompareBar.js";
import { FooterMark } from "../components/FooterMark.js";
import { FoundList } from "../components/FoundList.js";
import { SectionLabel } from "../components/SectionLabel.js";
import { Surface } from "../components/Surface.js";
import { Tagline } from "../components/Tagline.js";
import { UserChip } from "../components/UserChip.js";

/**
 * Tumbler end screen — rebuilt per the design handoff.
 *
 * Two-column layout:
 *   Left  — Tagline ("Round complete · New best" / "Round complete"),
 *           giant numeric score, body copy about the delta, CompareBar
 *           (prev best vs this round), bottom-anchored Restart +
 *           Play-again actions.
 *   Right — FoundList grid of words this round (3 columns).
 *
 * Persists the score: writes the personal best to settings, appends
 * a leaderboard entry (when scored > 0 and a user-name exists).
 */
export function TumblerEndScreen(): JSX.Element | null {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const goHome = useGameStore((s) => s.goHome);
  const currentUser = useGameStore((s) => s.currentUser);

  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<ReadonlyArray<LeaderboardEntry>>([]);

  // Capture-and-write on mount. Dep array is just the final score so a
  // re-render of the same session doesn't re-fire the IDB writes.
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

  const { score, foundWords } = screen;
  const isNewBest = previousBest !== null && score > previousBest;
  const delta = previousBest === null ? 0 : score - previousBest;

  const { color, radius, shadow, space, font, size, weight } = tokens;

  // Sort words by score descending — players naturally scan for their
  // best plays first; the handoff grid renders them in this order.
  const sortedWords = [...foundWords].sort(
    (a, b) => scoreTumblerWord(b) - scoreTumblerWord(a),
  );

  // CompareBar scale: 250 is generous enough to handle elite scores
  // without saturating, while still showing meaningful bar growth for
  // mid-range games (~80-150 pts).
  const compareMax = 250;

  return (
    <Surface padding={0}>
      <BackPill onClick={goHome} />
      {currentUser && <UserChip name={currentUser} />}

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: space.x10,
          padding: `${space.x16 + 16}px ${space.x10}px ${space.x6}px`,
          maxWidth: 1240,
          margin: "0 auto",
          width: "100%",
          alignContent: "start",
        }}
      >
        {/* Left — score + actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: space.x6 }}>
          <div>
            <Tagline style={{ color: color.success }}>
              {isNewBest ? "Round complete · New best" : "Round complete"}
            </Tagline>
            <h1
              style={{
                fontFamily: font.serif,
                fontWeight: weight.heavy,
                fontSize: size.display,
                lineHeight: 1,
                letterSpacing: "-0.025em",
                margin: `${space.x3}px 0 0`,
                color: color.brown,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {score}
            </h1>
            <p
              style={{
                margin: `${space.x3}px 0 0`,
                fontSize: size.bodyLg,
                color: color.inkSoft,
                maxWidth: 480,
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

          {previousBest !== null && previousBest > 0 && (
            <div
              style={{
                padding: space.x5,
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
                        padding: "6px 0",
                        borderBottom:
                          i === Math.min(leaderboard.length, 5) - 1
                            ? "none"
                            : `1px dashed ${color.creamDark}`,
                        fontSize: size.body,
                        background: isYou
                          ? `color-mix(in oklab, ${color.successBg} 60%, transparent)`
                          : "transparent",
                        borderRadius: 6,
                        paddingInline: 4,
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
                })}
              </ol>
            </div>
          )}

          <div style={{ display: "flex", gap: space.x3, marginTop: "auto", flexWrap: "wrap" }}>
            <Button
              kind="secondary"
              size="lg"
              style={{ flex: 1, minWidth: 140 }}
              onClick={() => setScreen({ kind: "tumbler" })}
            >
              Restart
            </Button>
            <Button
              kind="primary"
              size="lg"
              style={{ flex: 1, minWidth: 140 }}
              onClick={() => setScreen({ kind: "tumbler" })}
            >
              Play again
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
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
        </div>

        {/* Right — words grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: space.x4 }}>
          <FoundList
            title="Words you found"
            count={foundWords.length}
            columns={3}
            words={sortedWords}
          />
        </div>
      </div>

      <footer
        style={{ padding: `${space.x4}px ${space.x8}px ${space.x6}px` }}
      >
        <FooterMark />
      </footer>
    </Surface>
  );
}

/** Format an epoch timestamp as dd/MM/yyyy (local), per project defaults. */
function formatDate(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}
