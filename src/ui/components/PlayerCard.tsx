import type { Difficulty } from "../../engine/ai/bot.js";
import { tokens } from "../tokens.js";
import { ScoreChip } from "./ScoreChip.js";

export interface PlayerCardProps {
  readonly name: string;
  readonly score: number;
  /** Highlight as the current turn — thicker brown border + brown score chip. */
  readonly active?: boolean;
  /** If the player is the AI, the difficulty tier — shown as "· Friendly"
   *  / "· Steady" / etc. next to the name, so the row says what the
   *  computer's strength is at a glance. Omit for human players. */
  readonly aiDifficulty?: Difficulty;
}

/** Human-friendly label for each AI difficulty tier. */
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  friendly: "Friendly",
  easygoing: "Easygoing",
  steady: "Steady",
  sharp: "Sharp",
  master: "Master",
};

/**
 * In-game scoreboard row. Three-column grid: avatar (circle with the
 * first letter of the player's name) · name + status · score chip.
 *
 * Active state cues:
 *   - 2 px brown border (vs 1.5 px stroke when inactive)
 *   - Brown-on-cream avatar (vs cream-on-brownTint)
 *   - Moss "active" dot bottom-right of the avatar
 *   - "Your turn" caption in success colour (vs "Waiting" inkSoft)
 *   - Brown-toned score chip (vs ink-toned)
 *
 * The handoff specifies a 76 px minimum row height — generous so both
 * the avatar + the bigger score chip have headroom.
 */
export function PlayerCard({
  name,
  score,
  active,
  aiDifficulty,
}: PlayerCardProps): JSX.Element {
  const { color, radius, shadow, space, size, weight, font } = tokens;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: space.x4,
        padding: `${space.x4}px ${space.x5}px`,
        background: active
          ? color.paper
          : `color-mix(in oklab, ${color.paper} 70%, ${color.cream})`,
        border: active ? `2px solid ${color.brown}` : `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        boxShadow: active ? shadow.cardHover : shadow.card,
        minHeight: 76,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: active ? color.brown : color.brownTint,
          color: active ? color.cream : color.brown,
          display: "grid",
          placeItems: "center",
          fontFamily: font.serif,
          fontWeight: weight.bold,
          fontSize: 20,
          position: "relative",
          flexShrink: 0,
        }}
      >
        {name.charAt(0).toUpperCase()}
        {active && (
          <span
            style={{
              position: "absolute",
              right: -2,
              bottom: -2,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: color.success,
              border: `2px solid ${color.paper}`,
            }}
          />
        )}
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
          {aiDifficulty && (
            <span
              style={{
                fontSize: size.micro + 1,
                color: color.inkSoft,
                marginLeft: 8,
                fontWeight: weight.reg,
              }}
            >
              · {DIFFICULTY_LABEL[aiDifficulty]}
            </span>
          )}
        </span>
        <span
          style={{
            fontSize: size.micro + 1,
            color: active ? color.success : color.inkSoft,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            fontWeight: weight.med,
            marginTop: 2,
          }}
        >
          {active ? "Your turn" : "Waiting"}
        </span>
      </span>

      <ScoreChip value={score} big tone={active ? "brown" : "ink"} />
    </div>
  );
}
