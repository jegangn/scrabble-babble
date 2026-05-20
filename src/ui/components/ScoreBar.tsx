import type { PlayerState } from "../../engine/types.js";
import { ACCENT, TILE } from "../theme.js";

export interface ScoreBarProps {
  readonly players: ReadonlyArray<PlayerState>;
  readonly turn: number;
  readonly bagCount: number;
}

/**
 * Compact vertical scoreboard for the right column of GameScreen.
 *
 * Layout: each player on their own row, name left + score right. The
 * current player's row is filled with the accent colour and uses white
 * text for high contrast — replaces the previous underline-only "you're
 * up" cue which was easy to miss for older eyes. The bag count sits as
 * a small caption below.
 *
 * role="status" + aria-live=polite so screen readers announce score and
 * turn changes after every move.
 */
export function ScoreBar({ players, turn, bagCount }: ScoreBarProps): JSX.Element {
  return (
    <div
      className="flex flex-col w-full rounded-xl"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        background: TILE.bg,
        border: `2px solid ${ACCENT.primary}`,
        padding: 8,
        gap: 4,
      }}
    >
      {players.map((p, i) => {
        const active = i === turn;
        return (
          <div
            key={i}
            className="flex items-center justify-between"
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: active ? ACCENT.primary : "transparent",
              color: active ? "white" : ACCENT.text,
              fontWeight: active ? 700 : 500,
            }}
          >
            <span style={{ fontSize: "1em", overflow: "hidden", textOverflow: "ellipsis" }}>
              {p.name}
            </span>
            <span
              style={{
                fontSize: "1.5em",
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {p.score}
            </span>
          </div>
        );
      })}
      <div
        style={{
          textAlign: "center",
          fontSize: "0.8em",
          color: ACCENT.text,
          opacity: 0.7,
          marginTop: 2,
        }}
      >
        Bag · <span style={{ fontWeight: 700 }}>{bagCount}</span>
      </div>
    </div>
  );
}
