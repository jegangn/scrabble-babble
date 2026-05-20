import { useGameStore } from "../../store/gameStore.js";
import type { GameState, Variant } from "../../engine/types.js";
import { playUiTap } from "../../audio/sounds.js";
import { BackToHomeButton } from "../components/BackToHomeButton.js";
import { ACCENT } from "../theme.js";

function variantLabel(variant: Variant): string {
  switch (variant) {
    case "classic":
      return "Classic — 15×15";
    case "random":
      return "Random — 15×15";
    case "mini":
      return "Mini — 11×11";
  }
}

interface GameStats {
  readonly totalMoves: number;
  readonly topMoveScore: number;
  readonly topMoveWord: string | null;
}

function computeStats(game: GameState): GameStats {
  const placeEntries = game.history.filter((e) => e.move.kind === "place");
  let topScore = 0;
  let topWord: string | null = null;
  for (const entry of placeEntries) {
    if (entry.score > topScore) {
      topScore = entry.score;
      topWord = entry.mainWord;
    }
  }
  return {
    totalMoves: game.history.length,
    topMoveScore: topScore,
    topMoveWord: topWord,
  };
}

export function GameEndScreen(): JSX.Element | null {
  const game = useGameStore((s) => s.game);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const settings = useGameStore((s) => s.settings);
  const goHome = useGameStore((s) => s.goHome);

  if (!game || game.status.kind !== "ended") return null;

  const players = game.players;
  const reason = game.status.reason;
  const sorted = [...players]
    .map((p, i) => ({ ...p, index: i }))
    .sort((a, b) => b.score - a.score);
  const winner = sorted[0]!;
  const loser = sorted[1]!;
  const tied = winner.score === loser.score;
  const stats = computeStats(game);

  let reasonLabel = "";
  switch (reason.kind) {
    case "rack_out":
      reasonLabel = `${players[reason.playerIndex]?.name} emptied their rack.`;
      break;
    case "consecutive_passes":
      reasonLabel = "Both players passed twice in a row.";
      break;
    case "resignation":
      reasonLabel = `${players[reason.playerIndex]?.name} resigned.`;
      break;
  }

  const difficultyLabel =
    settings.opponent.kind === "ai"
      ? `vs Computer (${settings.opponent.difficulty})`
      : "Hot-seat";

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-5 p-6"
      style={{ position: "relative" }}
    >
      <BackToHomeButton onClick={goHome} />
      <h2 style={{ fontSize: "2.4em", fontWeight: 700, color: ACCENT.primary }}>
        Game over
      </h2>
      <p style={{ fontSize: "1.1em", opacity: 0.7 }}>{reasonLabel}</p>
      <div className="flex flex-col gap-3 w-full max-w-md">
        {players.map((p, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg p-4"
            style={{
              background: i === winner.index && !tied ? ACCENT.primary : "white",
              color: i === winner.index && !tied ? "white" : ACCENT.text,
              border: `2px solid ${ACCENT.primary}`,
              fontWeight: i === winner.index ? 700 : 500,
            }}
          >
            <span style={{ fontSize: "1.2em" }}>
              {p.name}
              {!tied && i === winner.index && " 🏆"}
            </span>
            <span style={{ fontSize: "1.6em" }}>{p.score}</span>
          </div>
        ))}
      </div>

      <div
        className="flex flex-col gap-2 w-full max-w-md rounded-lg p-3"
        style={{
          background: "rgba(255,255,255,0.5)",
          border: `1px solid ${ACCENT.primary}33`,
          color: ACCENT.text,
          fontSize: "0.95em",
        }}
      >
        <StatRow label="Total moves" value={String(stats.totalMoves)} />
        <StatRow
          label="Top move"
          value={
            stats.topMoveWord
              ? `${stats.topMoveWord} (${stats.topMoveScore})`
              : "—"
          }
        />
        <StatRow label="Board" value={variantLabel(game.variant)} />
        <StatRow label="Mode" value={difficultyLabel} />
      </div>

      {/* Home button removed — the top-left pill handles it. */}
      <div className="flex gap-3 w-full max-w-md mt-3">
        <button
          type="button"
          onClick={() => {
            playUiTap();
            startNewGame(settings.playerNames, settings.opponent, settings.variant);
          }}
          style={btnStyle("primary")}
        >
          Play again
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between items-baseline">
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function btnStyle(variant: "primary" | "secondary"): React.CSSProperties {
  return {
    flex: 1,
    background: variant === "primary" ? ACCENT.primary : "white",
    color: variant === "primary" ? "white" : ACCENT.text,
    border: variant === "primary" ? "none" : `2px solid ${ACCENT.primary}`,
    padding: "14px 20px",
    fontSize: "1.1em",
    fontWeight: 600,
    borderRadius: 10,
    minHeight: 56,
    touchAction: "manipulation",
  };
}
