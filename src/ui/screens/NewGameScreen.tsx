import { useState } from "react";
import type { Difficulty } from "../../engine/ai/bot.js";
import type { Variant } from "../../engine/types.js";
import type { Opponent } from "../../store/gameStore.js";
import { useGameStore } from "../../store/gameStore.js";
import { BackPill } from "../components/BackPill.js";
import { BoardOption } from "../components/BoardOption.js";
import { Button } from "../components/Button.js";
import { DifficultyCards } from "../components/DifficultyCards.js";
import { NameInput } from "../components/NameInput.js";
import { SectionLabel } from "../components/SectionLabel.js";
import { Segmented } from "../components/Segmented.js";
import { Surface } from "../components/Surface.js";
import { Tagline } from "../components/Tagline.js";
import { tokens } from "../tokens.js";

/**
 * New Game screen — single-column stacked layout to match the rhythm
 * of the other solo screens (Tumbler, Spelling Bee). Sections cascade
 * top-to-bottom: header → Players → Opponent → Difficulty (when
 * Computer is selected) → Board → Start. Max-width matches the solo
 * screens so the form column stays comfortable on iPad and phones.
 */
export function NewGameScreen(): JSX.Element {
  const settings = useGameStore((s) => s.settings);
  const currentUser = useGameStore((s) => s.currentUser);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const goHome = useGameStore((s) => s.goHome);

  // Player 1 defaults to the device "current user" so the device-owner
  // doesn't retype their own name every new game. Falls back to the last
  // saved Player 1 name, then to "Player 1".
  const [name1, setName1] = useState(currentUser ?? settings.playerNames[0]);
  const [name2, setName2] = useState(settings.playerNames[1]);
  const [opponentKind, setOpponentKind] = useState<Opponent["kind"]>(
    settings.opponent.kind,
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    settings.opponent.kind === "ai" ? settings.opponent.difficulty : "easygoing",
  );
  const [variant, setVariant] = useState<Variant>(settings.variant);

  // Start gate: both names must have a non-whitespace trimmed value.
  // Player 2 is auto-filled to "Computer" so it's never empty when AI;
  // but we still validate the hot-seat case here.
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

  return (
    <Surface padding={0}>
      <BackPill onClick={goHome} />

      <div
        style={{
          // Pinned to the viewport — page itself doesn't scroll. The
          // inner sections were tightened so the entire form (header,
          // Players, Opponent, Difficulty, Board, Start) fits inside one
          // iPad-landscape screen. Tag stack: 100dvh + overflow: hidden
          // on the outer + tighter gap/padding inside.
          height: "100dvh",
          maxHeight: "100dvh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: tokens.space.x4,
          padding: `${tokens.space.x12}px ${tokens.space.x6}px ${tokens.space.x4}px`,
          maxWidth: 720,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <header>
          <Tagline>Start a game</Tagline>
          <h1
            style={{
              fontFamily: tokens.font.serif,
              fontWeight: tokens.weight.heavy,
              fontSize: tokens.size.h1,
              margin: `${tokens.space.x2}px 0 0`,
              letterSpacing: "-0.02em",
              color: tokens.color.brown,
            }}
          >
            New game
          </h1>
        </header>

        <section>
          <SectionLabel>Players</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: tokens.space.x3 }}>
            <NameInput label="Player 1" value={name1} onChange={setName1} you />
            <NameInput
              label="Player 2"
              value={opponentKind === "ai" ? "Computer" : name2}
              onChange={setName2}
              disabled={opponentKind === "ai"}
            />
          </div>
        </section>

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

        {opponentKind === "ai" && (
          <section>
            <SectionLabel>Difficulty</SectionLabel>
            <DifficultyCards value={difficulty} onChange={setDifficulty} />
          </section>
        )}

        <section>
          <SectionLabel>Board</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: tokens.space.x3,
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
    </Surface>
  );
}
