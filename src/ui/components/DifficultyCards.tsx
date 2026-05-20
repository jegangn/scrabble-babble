import { playUiTap } from "../../audio/sounds.js";
import type { Difficulty } from "../../engine/ai/bot.js";
import { tokens } from "../tokens.js";

export interface DifficultyCardsProps {
  readonly value: Difficulty;
  readonly onChange: (value: Difficulty) => void;
}

interface Tier {
  readonly id: Difficulty;
  readonly label: string;
  readonly stars: 1 | 2 | 3 | 4 | 5;
}

const TIERS: ReadonlyArray<Tier> = [
  { id: "friendly", label: "Friendly", stars: 1 },
  { id: "easygoing", label: "Easygoing", stars: 2 },
  { id: "steady", label: "Steady", stars: 3 },
  { id: "sharp", label: "Sharp", stars: 4 },
  { id: "master", label: "Master", stars: 5 },
];

/**
 * Five-card difficulty picker with star ratings — a glanceable visual
 * progression alongside the tier name. No description text (per
 * earlier feedback) — the stars do the lifting.
 *
 * Selected state thickens the border to 2 px brown + bumps the shadow
 * to the hover tier; non-selected cards have a slightly tinted cream
 * background so the row reads as a unified picker, not five separate
 * cards floating on cream.
 */
export function DifficultyCards({ value, onChange }: DifficultyCardsProps): JSX.Element {
  const { color, radius, shadow, space, size, weight } = tokens;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: space.x2,
      }}
      role="radiogroup"
      aria-label="Difficulty"
    >
      {TIERS.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              if (selected) return;
              playUiTap();
              onChange(t.id);
            }}
            style={{
              appearance: "none",
              font: "inherit",
              textAlign: "left",
              background: selected
                ? color.paper
                : `color-mix(in oklab, ${color.paper} 70%, ${color.cream})`,
              border: selected ? `2px solid ${color.brown}` : `1.5px solid ${color.stroke}`,
              borderRadius: radius.card,
              padding: "14px 10px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minHeight: 76,
              cursor: selected ? "default" : "pointer",
              boxShadow: selected ? shadow.cardHover : shadow.card,
              touchAction: "manipulation",
            }}
          >
            <span
              style={{
                color: color.brown,
                fontSize: 12,
                lineHeight: 1,
                letterSpacing: ".05em",
              }}
              aria-hidden
            >
              {"★ ".repeat(t.stars).trim()}
            </span>
            <span
              style={{
                fontWeight: weight.med,
                fontSize: size.body,
                color: color.ink,
              }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
