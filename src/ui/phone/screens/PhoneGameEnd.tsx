import { useMemo } from "react";
import { useGameStore } from "../../../store/gameStore.js";
import type { Difficulty } from "../../../engine/ai/bot.js";
import type { GameState, Variant } from "../../../engine/types.js";
import { tokens } from "../../tokens.js";
import { Button } from "../../components/Button.js";
import { FooterMark } from "../../components/FooterMark.js";
import { ScoreChip } from "../../components/ScoreChip.js";
import { PhoneShell } from "../PhoneShell.js";
import { PhoneTopBar } from "../components/PhoneTopBar.js";

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

/** Title-cased difficulty label. */
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
 * Phone portrait game-end screen.
 *
 * Single scrollable column pinned to `var(--app-h)`:
 *   PhoneTopBar    — title + Home back button
 *   Winner banner  — "{Name} wins." in display serif, or "It's a tie."
 *   Score rows     — winner first, with success tint
 *   Stats card     — Total moves, Top move, Board, Mode, Bingos
 *   Action row     — Play again (primary) + Home (secondary), sticky bottom
 *
 * Reuses the exact same store selectors, result computation, and action
 * labels as `GameEndScreen.tsx`.
 */
export function PhoneGameEnd(): JSX.Element | null {
  const game = useGameStore((s) => s.game);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const settings = useGameStore((s) => s.settings);
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

  const taglineBody = tied ? (
    <>Even — a tied finish across {stats.totalMoves} moves.</>
  ) : (
    <>
      By {delta} point{delta === 1 ? "" : "s"}
      {stats.topMoveWord && (
        <>
          {" — best: "}
          <strong style={{ color: color.ink, fontWeight: weight.med }}>
            {stats.topMoveWord}
          </strong>
          {` for +${stats.topMoveScore}`}
        </>
      )}
      .
    </>
  );

  return (
    <PhoneShell
      top={
        <PhoneTopBar
          title={tied ? "It's a tie" : `${winner.name} wins`}
        />
      }
    >
      {/* Scrollable content column */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: `${space.x5}px ${space.x4}px`,
          gap: space.x5,
        }}
      >
        {/* Winner / tie banner */}
        <div>
          <span
            style={{
              display: "inline-block",
              fontSize: size.micro,
              fontWeight: weight.med,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: tied ? color.inkSoft : color.success,
              marginBottom: space.x2,
            }}
          >
            {tied ? "Game over · Tied" : "Game over · Winner"}
          </span>
          <h1
            style={{
              margin: 0,
              fontFamily: font.serif,
              fontWeight: weight.heavy,
              fontSize: size.h1,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              color: color.brown,
            }}
          >
            {tied ? "It's a tie." : `${winner.name} wins.`}
          </h1>
          <p
            style={{
              margin: `${space.x2}px 0 0`,
              fontSize: size.body,
              color: color.inkSoft,
              lineHeight: 1.5,
            }}
          >
            {taglineBody}
          </p>
        </div>

        {/* Score rows — winner-first order */}
        <div style={{ display: "flex", flexDirection: "column", gap: space.x3 }}>
          {sorted.map((p) => {
            const isWinner = !tied && p.index === winner.index;
            return (
              <PhoneFinalScoreRow
                key={p.index}
                name={p.name}
                score={p.score}
                winner={isWinner}
              />
            );
          })}
        </div>

        {/* Stats card */}
        <div
          style={{
            background: color.paper,
            border: `1.5px solid ${color.stroke}`,
            borderRadius: radius.panel,
            boxShadow: shadow.card,
            padding: space.x5,
            display: "flex",
            flexDirection: "column",
            gap: space.x3,
          }}
        >
          <span
            style={{
              fontSize: size.micro,
              fontWeight: weight.med,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: color.inkSoft,
            }}
          >
            This game
          </span>
          <PhoneStatRow label="Total moves" value={String(stats.totalMoves)} />
          <PhoneStatRow
            label="Top move"
            value={
              stats.topMoveWord ? `${stats.topMoveWord} · +${stats.topMoveScore}` : "—"
            }
          />
          <PhoneStatRow label="Board" value={variantLabel(game.variant)} />
          <PhoneStatRow label="Mode" value={modeLabel} />
          <PhoneStatRow label="Bingos" value={String(stats.bingos)} />

          {/* "Saved" chip */}
          <div
            style={{
              marginTop: space.x2,
              padding: `${space.x2}px ${space.x3}px`,
              background: color.successBg,
              borderRadius: radius.chip,
              color: color.success,
              fontSize: size.caption,
              fontWeight: weight.med,
              display: "flex",
              alignItems: "center",
              gap: space.x2,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: color.success,
                color: color.successBg,
                display: "grid",
                placeItems: "center",
                fontWeight: weight.bold,
                fontSize: 11,
                flexShrink: 0,
              }}
            >
              ✓
            </span>
            Saved to your history
          </div>
        </div>

        {/* Footer mark */}
        <FooterMark style={{ paddingTop: space.x2, paddingBottom: space.x2 }} />
      </div>

      {/* Action row — sticky, outside the scroll area so it's always reachable */}
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
          style={{ flex: 0, minWidth: 80 }}
          ariaLabel="Home"
          onClick={goHome}
        >
          Home
        </Button>
        <Button
          kind="primary"
          size="md"
          style={{ flex: 1 }}
          onClick={() =>
            startNewGame(settings.playerNames, settings.opponent, settings.variant)
          }
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

interface PhoneFinalScoreRowProps {
  readonly name: string;
  readonly score: number;
  readonly winner: boolean;
}

function PhoneFinalScoreRow({ name, score, winner }: PhoneFinalScoreRowProps): JSX.Element {
  const { color, radius, shadow, space, font, size, weight } = tokens;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: space.x3,
        padding: `${space.x3}px ${space.x4}px`,
        background: winner
          ? `color-mix(in oklab, ${color.successBg} 60%, ${color.paper})`
          : color.paper,
        border: winner ? `1.5px solid ${color.success}` : `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        boxShadow: shadow.card,
      }}
    >
      {/* Avatar circle */}
      <span
        aria-hidden
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: winner ? color.success : color.brownTint,
          color: winner ? color.paper : color.brown,
          display: "grid",
          placeItems: "center",
          fontFamily: font.serif,
          fontWeight: weight.bold,
          fontSize: 17,
          flexShrink: 0,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
      {/* Name + winner badge */}
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span
          style={{
            fontSize: size.body,
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
              fontSize: size.micro,
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
      <ScoreChip value={score} tone={winner ? "success" : "ink"} />
    </div>
  );
}

interface PhoneStatRowProps {
  readonly label: string;
  readonly value: string;
}

function PhoneStatRow({ label, value }: PhoneStatRowProps): JSX.Element {
  const { color, space, size, weight } = tokens;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: `${space.x2}px 0`,
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
