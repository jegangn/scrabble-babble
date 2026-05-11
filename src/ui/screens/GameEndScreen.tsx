import { useGameStore } from "../../store/gameStore.js";
import { ACCENT } from "../theme.js";

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

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 p-6">
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
      <div className="flex gap-3 w-full max-w-md mt-3">
        <button type="button" onClick={goHome} style={btnStyle("secondary")}>
          Home
        </button>
        <button
          type="button"
          onClick={() => startNewGame(settings.playerNames)}
          style={btnStyle("primary")}
        >
          Play again
        </button>
      </div>
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
