import { playUiTap } from "../../audio/sounds.js";
import { tokens } from "../tokens.js";

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

export interface SegmentedProps<T extends string> {
  readonly options: ReadonlyArray<SegmentedOption<T>>;
  readonly value: T;
  readonly onChange: (value: T) => void;
}

/**
 * Two-or-three option toggle, styled like an iOS segmented control but in
 * the brand palette: cream-dark track, the selected segment is a white
 * card with the standard card shadow. The 4 px padding on the track
 * creates the inset look without a real inset shadow.
 *
 * Tap targets are full-segment-width with a 52 px minimum height — meets
 * the design's 44 px floor + room for the larger body type. Plays the
 * soft tap-tick on change to confirm activation; the click doesn't
 * re-fire if the user taps the already-active segment.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: SegmentedProps<T>): JSX.Element {
  const { color, radius, shadow, size, weight } = tokens;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        gap: 4,
        padding: 4,
        background: color.creamDark,
        borderRadius: radius.card,
        border: `1px solid ${color.stroke}`,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              if (active) return;
              playUiTap();
              onChange(o.value);
            }}
            aria-pressed={active}
            style={{
              appearance: "none",
              font: "inherit",
              background: active ? color.paper : "transparent",
              color: active ? color.ink : color.inkSoft,
              border: active ? `1px solid ${color.stroke}` : "1px solid transparent",
              borderRadius: radius.chip,
              padding: "14px 12px",
              fontSize: size.body,
              fontWeight: active ? weight.med : weight.reg,
              minHeight: 52,
              cursor: active ? "default" : "pointer",
              boxShadow: active ? shadow.card : "none",
              touchAction: "manipulation",
              transition: "background 200ms ease, color 200ms ease",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
