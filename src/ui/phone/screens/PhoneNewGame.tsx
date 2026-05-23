import { useState } from "react";
import type { Difficulty } from "../../../engine/ai/bot.js";
import type { Variant } from "../../../engine/types.js";
import type { Opponent } from "../../../store/gameStore.js";
import { useGameStore } from "../../../store/gameStore.js";
import { tokens } from "../../tokens.js";
import { BoardOption } from "../../components/BoardOption.js";
import { Button } from "../../components/Button.js";
import { DifficultyCards } from "../../components/DifficultyCards.js";
import { NameInput } from "../../components/NameInput.js";
import { SectionLabel } from "../../components/SectionLabel.js";
import { Segmented } from "../../components/Segmented.js";
import { PhoneShell } from "../PhoneShell.js";
import { PhoneTopBar } from "../components/PhoneTopBar.js";

/**
 * Phone portrait New Game screen. Single-column scrollable form matching
 * NewGameScreen's controls and store actions.
 *
 * Phone default variant is Mini (not read from settings) — optimised for
 * the smaller screen; all three variants remain selectable.
 */
export function PhoneNewGame(): JSX.Element {
  const settings = useGameStore((s) => s.settings);
  const currentUser = useGameStore((s) => s.currentUser);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const setScreen = useGameStore((s) => s.setScreen);

  const [name1, setName1] = useState(currentUser ?? settings.playerNames[0]);
  const [name2, setName2] = useState(settings.playerNames[1]);
  const [opponentKind, setOpponentKind] = useState<Opponent["kind"]>(
    settings.opponent.kind,
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    settings.opponent.kind === "ai" ? settings.opponent.difficulty : "easygoing",
  );
  // Phone default is mini — NOT read from settings.variant
  const [variant, setVariant] = useState<Variant>("mini");

  const validName1 = name1.trim().length > 0;
  const validName2 = opponentKind === "ai" || name2.trim().length > 0;
  const canStart = validName1 && validName2;

  const onStart = (): void => {
    const n1 = name1.trim() || "Player 1";
    const n2 = name2.trim() || "Player 2";
    const opponent: Opponent =
      opponentKind === "ai" ? { kind: "ai", difficulty } : { kind: "human" };
    startNewGame([n1, n2], opponent, variant);
  };

  const { space } = tokens;

  return (
    <PhoneShell
      top={
        <PhoneTopBar
          title="New game"
          onBack={() => setScreen({ kind: "home" })}
          backLabel="Home"
        />
      }
    >
      {/* Scrollable form */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: `${space.x4}px ${space.x4}px ${space.x8}px`,
          gap: space.x5,
        }}
      >
        {/* Players */}
        <section>
          <SectionLabel>Players</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: space.x3 }}>
            <NameInput label="Player 1" value={name1} onChange={setName1} you />
            <NameInput
              label="Player 2"
              value={opponentKind === "ai" ? "Computer" : name2}
              onChange={setName2}
              disabled={opponentKind === "ai"}
            />
          </div>
        </section>

        {/* Opponent */}
        <section>
          <SectionLabel>Opponent</SectionLabel>
          <Segmented<Opponent["kind"]>
            options={[
              { value: "human", label: "Hot-seat" },
              { value: "ai", label: "Computer" },
            ]}
            value={opponentKind}
            onChange={setOpponentKind}
          />
        </section>

        {/* Difficulty — only when Computer */}
        {opponentKind === "ai" && (
          <section>
            <SectionLabel>Difficulty</SectionLabel>
            <DifficultyCards value={difficulty} onChange={setDifficulty} />
          </section>
        )}

        {/* Board variant */}
        <section>
          <SectionLabel>Board</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: space.x3,
            }}
          >
            <BoardOption
              variant="classic"
              label="Classic"
              sub="15 × 15"
              selected={variant === "classic"}
              onSelect={() => setVariant("classic")}
            />
            <BoardOption
              variant="random"
              label="Random"
              sub="15 × 15 shuffled"
              selected={variant === "random"}
              onSelect={() => setVariant("random")}
            />
            <BoardOption
              variant="mini"
              label="Mini"
              sub="11 × 11"
              selected={variant === "mini"}
              onSelect={() => setVariant("mini")}
            />
          </div>
        </section>

        {/* Start */}
        <section>
          <Button kind="primary" size="lg" full onClick={onStart} disabled={!canStart}>
            Start game
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M6 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </section>
      </div>
    </PhoneShell>
  );
}
