import { useMemo } from "react";
import { useGameStore } from "../../store/gameStore.js";
import type { Difficulty } from "../../engine/ai/bot.js";
import type { GameState, Variant } from "../../engine/types.js";
import { tokens } from "../tokens.js";
import { BackPill } from "../components/BackPill.js";
import { Button } from "../components/Button.js";
import { FooterMark } from "../components/FooterMark.js";
import { ScoreChip } from "../components/ScoreChip.js";
import { SectionLabel } from "../components/SectionLabel.js";
import { Surface } from "../components/Surface.js";
import { Tagline } from "../components/Tagline.js";
import { UserChip } from "../components/UserChip.js";

/** Display name for the board variant. */
function variantLabel(variant: Variant): string {
  switch (variant) {
    case "classic":
      return "Classic 15 × 15";
    case "random":
      return "Random 15 × 15";
    case "mini":
      return "Mini 11 × 11";
  }
}

/** Title-cased difficulty label for the "Mode" stat. */
function difficultyLabel(d: Difficulty): string {
  switch (d) {
    case "friendly":
      return "Friendly";
    case "easygoing":
      return "Easygoing";
    case "steady":
      return "Steady";
    case "sharp":
      return "Sharp";
    case "master":
      return "Master";
  }
}

interface GameStats {
  readonly totalMoves: number;
  readonly topMoveScore: number;
  readonly topMoveWord: string | null;
  readonly bingos: number;
}

function computeStats(game: GameState): GameStats {
  const placeEntries = game.history.filter((e) => e.move.kind === "place");
  let topScore = 0;
  let topWord: string | null = null;
  let bingos = 0;
  for (const entry of placeEntries) {
    if (entry.score > topScore) {
      topScore = entry.score;
      topWord = entry.mainWord;
    }
    if (entry.score && entry.move.kind === "place" && entry.move.placements.length === 7) {
      bingos++;
    }
  }
  return {
    totalMoves: game.history.length,
    topMoveScore: topScore,
    topMoveWord: topWord,
    bingos,
  };
}

/**
 * Game-end screen — rebuilt per the design handoff.
 *
 * Two-column layout (collapses to single column on narrow widths):
 *   Left  — winner banner ("{Name} wins." in display serif), tagline
 *           with point delta + top-move callout, two FinalScoreRow
 *           cards (winner gets success-tinted bg + score chip),
 *           bottom-anchored Play-again button.
 *   Right — "This game" stats card: Total moves, Top move, Board,
 *           Mode, Bingos played + a moss "Saved to your history" chip.
 *
 * The winner headline (option a in the design Q4) replaces the old
 * "Game over" — warmer, names the actual player, falls back to
 * "It's a tie." on a tied final score.
 */
export function GameEndScreen(): JSX.Element | null {
  const game = useGameStore((s) => s.game);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const settings = useGameStore((s) => s.settings);
  const currentUser = useGameStore((s) => s.currentUser);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);
  const goHome = useGameStore((s) => s.goHome);

  const stats = useMemo(() => (game ? computeStats(game) : null), [game]);

  if (!game || game.status.kind !== "ended" || !stats) return null;

  const players = game.players;
  const sorted = [...players]
    .map((p, i) => ({ ...p, index: i }))
    .sort((a, b) => b.score - a.score);
  const winner = sorted[0]!;
  const runnerUp = sorted[1]!;
  const tied = winner.score === runnerUp.score;
  const delta = winner.score - runnerUp.score;

  const modeLabel =
    settings.opponent.kind === "ai"
      ? `vs Computer · ${difficultyLabel(settings.opponent.difficulty)}`
      : "Hot-seat";

  const { color, radius, shadow, space, font, size, weight } = tokens;

  // Tagline body — tied vs win-by-N + optional top-move callout. We
  // build it as a fragment so the strong colour swap works inline.
  const taglineBody = tied ? (
    <>It was even — a tied finish across {stats.totalMoves} moves.</>
  ) : (
    <>
      By {delta} point{delta === 1 ? "" : "s"}
      {stats.topMoveWord && (
        <>
          {" "}
          — best move:{" "}
          <strong style={{ color: color.ink, fontWeight: weight.med }}>
            {stats.topMoveWord}
          </strong>{" "}
          for +{stats.topMoveScore}
        </>
      )}
      .
    </>
  );

  return (
    <Surface padding={0}>
      <BackPill onClick={goHome} />
      {currentUser && (
        <UserChip name={currentUser} onClick={() => setCurrentUser(currentUser)} />
      )}

      <div
        style={{
          flex: 1,
          padding: `${space.x16}px ${space.x12}px ${space.x6}px`,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: space.x10,
          alignContent: "start",
          maxWidth: 1240,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Left — winner + scoreboard */}
        <div style={{ display: "flex", flexDirection: "column", gap: space.x6 }}>
          <div>
            <Tagline style={{ color: color.success }}>
              {tied ? "Game over · Tied" : "Game over · Winner"}
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
              }}
            >
              {tied ? "It's a tie." : `${winner.name} wins.`}
            </h1>
            <p
              style={{
                margin: `${space.x3}px 0 0`,
                fontSize: size.bodyLg,
                color: color.inkSoft,
                maxWidth: 480,
              }}
            >
              {taglineBody}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: space.x3 }}>
            {sorted.map((p) => {
              const isWinner = !tied && p.index === winner.index;
              return (
                <FinalScoreRow
                  key={p.index}
                  name={p.name}
                  score={p.score}
                  winner={isWinner}
                />
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              gap: space.x3,
              marginTop: "auto",
              flexWrap: "wrap",
            }}
          >
            <Button
              kind="primary"
              size="lg"
              style={{ flex: 1, minWidth: 200 }}
              muted
              onClick={() =>
                startNewGame(settings.playerNames, settings.opponent, settings.variant)
              }
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

        {/* Right — stats card */}
        <div
          style={{
            background: color.paper,
            border: `1.5px solid ${color.stroke}`,
            borderRadius: radius.panel,
            boxShadow: shadow.card,
            padding: space.x8,
            display: "flex",
            flexDirection: "column",
            gap: space.x4,
          }}
        >
          <SectionLabel style={{ marginBottom: 0 }}>This game</SectionLabel>
          <StatRow label="Total moves" value={String(stats.totalMoves)} />
          <StatRow
            label="Top move"
            value={
              stats.topMoveWord ? `${stats.topMoveWord} · +${stats.topMoveScore}` : "—"
            }
          />
          <StatRow label="Board" value={variantLabel(game.variant)} />
          <StatRow label="Mode" value={modeLabel} />
          <StatRow label="Bingos played" value={String(stats.bingos)} />

          <div
            style={{
              marginTop: space.x3,
              padding: space.x4,
              background: color.successBg,
              borderRadius: radius.chip,
              color: color.success,
              fontSize: size.caption,
              fontWeight: weight.med,
              display: "flex",
              alignItems: "center",
              gap: space.x3,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: color.success,
                color: color.successBg,
                display: "grid",
                placeItems: "center",
                fontWeight: weight.bold,
              }}
            >
              ✓
            </span>
            Saved to your history
          </div>
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

interface FinalScoreRowProps {
  readonly name: string;
  readonly score: number;
  readonly winner: boolean;
}

function FinalScoreRow({ name, score, winner }: FinalScoreRowProps): JSX.Element {
  const { color, radius, shadow, space, font, size, weight } = tokens;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: space.x4,
        padding: `${space.x4}px ${space.x5}px`,
        background: winner
          ? `color-mix(in oklab, ${color.successBg} 60%, ${color.paper})`
          : color.paper,
        border: winner ? `1.5px solid ${color.success}` : `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        boxShadow: shadow.card,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: winner ? color.success : color.brownTint,
          color: winner ? color.paper : color.brown,
          display: "grid",
          placeItems: "center",
          fontFamily: font.serif,
          fontWeight: weight.bold,
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span
          style={{
            fontSize: size.bodyLg,
            fontWeight: weight.med,
            color: color.ink,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </span>
        {winner && (
          <span
            style={{
              fontSize: size.micro + 1,
              color: color.success,
              fontWeight: weight.med,
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            Winner
          </span>
        )}
      </span>
      <ScoreChip value={score} big tone={winner ? "success" : "ink"} />
    </div>
  );
}

interface StatRowProps {
  readonly label: string;
  readonly value: string;
}

function StatRow({ label, value }: StatRowProps): JSX.Element {
  const { color, space, size, weight } = tokens;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: `${space.x3}px 0`,
        borderBottom: `1px dashed ${color.creamDark}`,
      }}
    >
      <span style={{ color: color.inkSoft, fontSize: size.body }}>{label}</span>
      <span
        style={{
          color: color.ink,
          fontSize: size.body,
          fontWeight: weight.med,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
