import { playUiTap } from "../../audio/sounds.js";
import type { Variant } from "../../engine/types.js";
import { tokens } from "../tokens.js";

export interface BoardOptionProps {
  readonly variant: Variant;
  readonly label: string;
  readonly sub: string;
  readonly selected?: boolean;
  readonly onSelect: () => void;
}

/**
 * Board-picker card on the New Game screen. Each card shows a 3×3
 * miniature board thumbnail above the label so the user gets a quick
 * visual preview of where the premium squares sit on each variant.
 *
 * Three card per row, all the same shape. Selected state thickens the
 * border to 2 px brown + bumps the shadow to the hover tier.
 */
export function BoardOption({
  variant,
  label,
  sub,
  selected,
  onSelect,
}: BoardOptionProps): JSX.Element {
  const { color, radius, shadow, space, size, weight } = tokens;
  return (
    <button
      type="button"
      onClick={() => {
        if (selected) return;
        playUiTap();
        onSelect();
      }}
      aria-pressed={selected}
      style={{
        appearance: "none",
        font: "inherit",
        textAlign: "left",
        background: color.paper,
        border: selected ? `2px solid ${color.brown}` : `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        padding: space.x4,
        display: "flex",
        flexDirection: "column",
        gap: space.x3,
        cursor: selected ? "default" : "pointer",
        boxShadow: selected ? shadow.cardHover : shadow.card,
        touchAction: "manipulation",
      }}
    >
      <MiniBoardThumb variant={variant} />
      <span style={{ fontWeight: weight.med, fontSize: size.body, color: color.ink }}>
        {label}
      </span>
      <span style={{ fontSize: size.micro + 1, color: color.inkSoft, marginTop: -4 }}>
        {sub}
      </span>
    </button>
  );
}

/**
 * 3×3 schematic preview of the board variant's premium layout. Each
 * grid spot is a small rounded square in the appropriate premium colour.
 * The centre is always the brown star to match the actual board.
 */
function MiniBoardThumb({ variant }: { variant: Variant }): JSX.Element {
  const { square, color, radius } = tokens;
  // 9 cells in a 3×3 grid. Each variant gets its own pattern that
  // mirrors the dominant premium squares of the real board.
  const cells: ReadonlyArray<string> = (() => {
    switch (variant) {
      case "classic":
        return [
          square.tw.bg, square.dl.bg, square.tw.bg,
          square.dl.bg, color.brown, square.dl.bg,
          square.tw.bg, square.dl.bg, square.tw.bg,
        ];
      case "random":
        return [
          square.tl.bg, square.base, square.dw.bg,
          square.base, color.brown, square.tw.bg,
          square.dw.bg, square.dl.bg, square.base,
        ];
      case "mini":
        return [
          square.tw.bg, square.tl.bg, square.tw.bg,
          square.dl.bg, color.brown, square.dl.bg,
          square.tw.bg, square.tl.bg, square.tw.bg,
        ];
    }
  })();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 3,
        padding: 6,
        background: color.brownTint,
        borderRadius: radius.chip,
        aspectRatio: "1 / 1",
      }}
    >
      {cells.map((bg, i) => {
        // 3×3 grid: indices 0, 2, 6, 8 are the four corner cells. Round
        // only their OUTER corner so each thumbnail's corner cells visually
        // kiss the container's chip radius, mirroring the real-board
        // corner treatment in BoardCell.
        const isTopLeft = i === 0;
        const isTopRight = i === 2;
        const isBottomLeft = i === 6;
        const isBottomRight = i === 8;
        const OUTER = 5;
        const INNER = 4;
        return (
          <div
            key={i}
            style={{
              background: bg,
              borderTopLeftRadius: isTopLeft ? OUTER : INNER,
              borderTopRightRadius: isTopRight ? OUTER : INNER,
              borderBottomLeftRadius: isBottomLeft ? OUTER : INNER,
              borderBottomRightRadius: isBottomRight ? OUTER : INNER,
              aspectRatio: "1 / 1",
            }}
          />
        );
      })}
    </div>
  );
}
