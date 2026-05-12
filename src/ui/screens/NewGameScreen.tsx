import { useState } from "react";
import type { Difficulty } from "../../engine/ai/bot.js";
import type { Variant } from "../../engine/types.js";
import type { Opponent } from "../../store/gameStore.js";
import { useGameStore } from "../../store/gameStore.js";
import { ACCENT } from "../theme.js";

export function NewGameScreen(): JSX.Element {
  const settings = useGameStore((s) => s.settings);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const goHome = useGameStore((s) => s.goHome);

  const [name1, setName1] = useState(settings.playerNames[0]);
  const [name2, setName2] = useState(settings.playerNames[1]);
  const [opponentKind, setOpponentKind] = useState<Opponent["kind"]>(
    settings.opponent.kind,
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    settings.opponent.kind === "ai" ? settings.opponent.difficulty : "medium",
  );
  const [variant, setVariant] = useState<Variant>(settings.variant);

  const onStart = () => {
    const n1 = name1.trim() || "Player 1";
    const n2 = name2.trim() || "Player 2";
    const opponent: Opponent =
      opponentKind === "ai" ? { kind: "ai", difficulty } : { kind: "human" };
    startNewGame([n1, n2], opponent, variant);
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
      <h2 style={{ fontSize: "2em", fontWeight: 700, color: ACCENT.primary }}>New game</h2>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <label className="flex flex-col gap-1">
          <span style={labelStyle}>Player 1</span>
          <input
            value={name1}
            onChange={(e) => setName1(e.target.value)}
            style={inputStyle}
            autoFocus
          />
        </label>

        <fieldset style={fieldsetStyle}>
          <legend style={labelStyle}>Opponent</legend>
          <div className="flex flex-col gap-2 mt-1">
            <RadioRow
              name="opponent"
              value="human"
              checked={opponentKind === "human"}
              onChange={() => setOpponentKind("human")}
              label="Hot-seat (pass the iPad)"
            />
            <RadioRow
              name="opponent"
              value="ai"
              checked={opponentKind === "ai"}
              onChange={() => setOpponentKind("ai")}
              label="Computer"
            />
          </div>
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <legend style={labelStyle}>Board</legend>
          <div className="flex flex-col gap-2 mt-1">
            <RadioRow
              name="variant"
              value="classic"
              checked={variant === "classic"}
              onChange={() => setVariant("classic")}
              label="Classic — 15×15"
            />
            <RadioRow
              name="variant"
              value="random"
              checked={variant === "random"}
              onChange={() => setVariant("random")}
              label="Random — 15×15 shuffled premiums"
            />
            <RadioRow
              name="variant"
              value="mini"
              checked={variant === "mini"}
              onChange={() => setVariant("mini")}
              label="Mini — 11×11, shorter game"
            />
          </div>
        </fieldset>

        {opponentKind === "human" ? (
          <label className="flex flex-col gap-1">
            <span style={labelStyle}>Player 2</span>
            <input
              value={name2}
              onChange={(e) => setName2(e.target.value)}
              style={inputStyle}
            />
          </label>
        ) : (
          <fieldset style={fieldsetStyle}>
            <legend style={labelStyle}>Difficulty</legend>
            <div className="flex flex-col gap-2 mt-1">
              <RadioRow
                name="difficulty"
                value="easy"
                checked={difficulty === "easy"}
                onChange={() => setDifficulty("easy")}
                label="Easy — random legal moves"
              />
              <RadioRow
                name="difficulty"
                value="medium"
                checked={difficulty === "medium"}
                onChange={() => setDifficulty("medium")}
                label="Medium — best score each turn"
              />
              <RadioRow
                name="difficulty"
                value="hard"
                checked={difficulty === "hard"}
                onChange={() => setDifficulty("hard")}
                label="Hard — looks one move ahead"
              />
            </div>
          </fieldset>
        )}

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

interface RadioRowProps {
  readonly name: string;
  readonly value: string;
  readonly checked: boolean;
  readonly onChange: () => void;
  readonly label: string;
}

function RadioRow({ name, value, checked, onChange, label }: RadioRowProps): JSX.Element {
  return (
    <label
      className="flex items-center gap-3"
      style={{
        fontSize: "1em",
        color: ACCENT.text,
        minHeight: 44,
        cursor: "pointer",
        touchAction: "manipulation",
      }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        style={{ width: 22, height: 22, accentColor: ACCENT.primary }}
      />
      <span>{label}</span>
    </label>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "0.9em",
  color: ACCENT.text,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: "1.1em",
  borderRadius: 8,
  border: `2px solid ${ACCENT.primary}`,
  background: "white",
  color: ACCENT.text,
  minHeight: 48,
};

const fieldsetStyle: React.CSSProperties = {
  border: `1px solid ${ACCENT.primary}33`,
  borderRadius: 8,
  padding: "8px 12px 12px",
  background: "rgba(255,255,255,0.4)",
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
