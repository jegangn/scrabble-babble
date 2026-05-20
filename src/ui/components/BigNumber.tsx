import { tokens } from "../tokens.js";

export type BigNumberTone = "ink" | "brown" | "success" | "warn";

export interface BigNumberProps {
  /** Number or pre-formatted string (e.g. "0:42" for timer). */
  readonly value: string | number;
  /** Small uppercase caption above the number. */
  readonly label: string;
  /** Colour tone — see {@link BigNumberTone}. */
  readonly tone?: BigNumberTone;
  /** Compact variant — smaller padding + h3 number. Used when screen
      real estate is tight (Tumbler header). */
  readonly compact?: boolean;
  /** Fixed pixel width — pins the outer box so the readout's value
      changing (e.g. a ticking timer dropping a digit) doesn't reflow
      the row. Tabular-nums handles digit-width parity inside, but the
      box itself only stays still if width is explicit. */
  readonly width?: number;
}

/**
 * Large numeric panel used in Tumbler's header (timer + score). The
 * serif heavy display of the number reads from across the room — Tumbler
 * is fast-paced and the older user shouldn't have to squint to see how
 * many seconds are left. `tabular-nums` keeps the digit columns aligned
 * as the timer ticks down.
 */
export function BigNumber({ value, label, tone = "ink", compact = false, width }: BigNumberProps): JSX.Element {
  const { color, radius, space, font, size, weight, shadow } = tokens;
  const palette =
    tone === "brown"
      ? { bg: color.brown, fg: color.cream, border: color.brownDark }
      : tone === "success"
        ? { bg: color.successBg, fg: color.success, border: color.success }
        : tone === "warn"
          ? { bg: color.warnBg, fg: color.brownDark, border: color.warn }
          : { bg: color.paper, fg: color.ink, border: color.stroke };

  return (
    <div
      style={{
        background: palette.bg,
        color: palette.fg,
        border: `1.5px solid ${palette.border}`,
        borderRadius: radius.panel,
        padding: compact ? `${space.x2}px ${space.x4}px` : `${space.x4}px ${space.x6}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        ...(width !== undefined
          ? { width }
          : { minWidth: compact ? 96 : 140 }),
        boxShadow: tone === "ink" ? shadow.card : "none",
      }}
    >
      <span
        style={{
          fontSize: size.micro,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          fontWeight: weight.med,
          opacity: 0.75,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: font.serif,
          fontWeight: weight.heavy,
          fontSize: compact ? size.h3 : size.h1,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          marginTop: 2,
        }}
      >
        {value}
      </span>
    </div>
  );
}
