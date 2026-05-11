import { useState } from "react";
import { useGameStore } from "../../store/gameStore.js";
import { ACCENT } from "../theme.js";

export function NewGameScreen(): JSX.Element {
  const settings = useGameStore((s) => s.settings);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const goHome = useGameStore((s) => s.goHome);

  const [name1, setName1] = useState(settings.playerNames[0]);
  const [name2, setName2] = useState(settings.playerNames[1]);

  const onStart = () => {
    const n1 = name1.trim() || "Player 1";
    const n2 = name2.trim() || "Player 2";
    startNewGame([n1, n2]);
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
      <h2 style={{ fontSize: "2em", fontWeight: 700, color: ACCENT.primary }}>New game</h2>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <label className="flex flex-col gap-1">
          <span style={{ fontSize: "0.9em", color: ACCENT.text }}>Player 1</span>
          <input
            value={name1}
            onChange={(e) => setName1(e.target.value)}
            style={inputStyle}
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1">
          <span style={{ fontSize: "0.9em", color: ACCENT.text }}>Player 2</span>
          <input
            value={name2}
            onChange={(e) => setName2(e.target.value)}
            style={inputStyle}
          />
        </label>
        <div className="flex gap-3 mt-2">
          <button type="button" onClick={goHome} style={btnStyle("secondary")}>
            Back
          </button>
          <button type="button" onClick={onStart} style={btnStyle("primary")}>
            Start
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: "1.1em",
  borderRadius: 8,
  border: `2px solid ${ACCENT.primary}`,
  background: "white",
  color: ACCENT.text,
  minHeight: 48,
};

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
