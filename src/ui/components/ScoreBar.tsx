import type { PlayerState } from "../../engine/types.js";
import { ACCENT, TILE } from "../theme.js";

export interface ScoreBarProps {
  readonly players: ReadonlyArray<PlayerState>;
  readonly turn: number;
  readonly bagCount: number;
}

export function ScoreBar({ players, turn, bagCount }: ScoreBarProps): JSX.Element {
  return (
    // role="status" + aria-live=polite so a screen reader announces score
    // changes after a turn. aria-atomic groups the whole bar into one
    // announcement instead of reading individual updated nodes.
    <div className="flex w-full items-center justify-between gap-3 p-3 rounded-xl"
         role="status"
         aria-live="polite"
         aria-atomic="true"
         style={{ background: TILE.bg, border: `2px solid ${ACCENT.primary}` }}>
      {players.map((p, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center"
          style={{
            color: ACCENT.text,
            opacity: i === turn ? 1 : 0.55,
            fontWeight: i === turn ? 700 : 500,
            borderBottom: i === turn ? `3px solid ${ACCENT.primary}` : "3px solid transparent",
            paddingBottom: 2,
          }}
        >
          <div style={{ fontSize: "0.85em" }}>{p.name}</div>
          <div style={{ fontSize: "1.6em" }}>{p.score}</div>
        </div>
      ))}
      <div className="flex flex-col items-center px-2" style={{ color: ACCENT.text }}>
        <div style={{ fontSize: "0.7em", opacity: 0.7 }}>Bag</div>
        <div style={{ fontSize: "1.1em", fontWeight: 600 }}>{bagCount}</div>
      </div>
    </div>
  );
}
