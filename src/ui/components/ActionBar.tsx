import { ACCENT } from "../theme.js";

export interface ActionBarProps {
  readonly canSubmit: boolean;
  readonly hasPending: boolean;
  /** False when the bag is too small to swap (rules.minBagToSwap floor). */
  readonly canSwap: boolean;
  readonly onSubmit: () => void;
  readonly onRecall: () => void;
  readonly onShuffle: () => void;
  readonly onSwap: () => void;
  readonly onPass: () => void;
  readonly onResign: () => void;
}

interface ButtonProps {
  readonly onClick: () => void;
  readonly children: React.ReactNode;
  readonly disabled?: boolean;
  readonly variant?: "primary" | "secondary" | "danger";
  /** Tall + bold prominent style. Used for Submit. */
  readonly large?: boolean;
}

function Btn({
  onClick,
  children,
  disabled,
  variant = "secondary",
  large = false,
}: ButtonProps): JSX.Element {
  const styles: Record<NonNullable<ButtonProps["variant"]>, React.CSSProperties> = {
    primary: { background: ACCENT.primary, color: "white", border: "none" },
    secondary: { background: "white", color: ACCENT.text, border: `2px solid ${ACCENT.primary}` },
    danger: { background: ACCENT.danger, color: "white", border: "none" },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md font-semibold w-full"
      style={{
        ...styles[variant],
        padding: large ? "16px 20px" : "10px 14px",
        minHeight: large ? 64 : 44,
        fontSize: large ? "1.3em" : "1em",
        fontWeight: large ? 700 : 600,
        opacity: disabled ? 0.4 : 1,
        touchAction: "manipulation",
        // letterSpacing on the large Submit gives it more visual weight.
        letterSpacing: large ? "0.04em" : "normal",
        // boxShadow for primary button only — implies "this is the action".
        boxShadow:
          large && variant === "primary" && !disabled
            ? "0 3px 0 rgba(0,0,0,0.18)"
            : "none",
      }}
    >
      {children}
    </button>
  );
}

/**
 * Vertical action stack for the right column. The Submit button is the
 * primary affordance — full-width, taller, larger type — so it's never
 * lost in a wrap-row with the others. Secondary actions sit in a tight
 * 2-column grid below. Resign stays on its own row in danger style.
 */
export function ActionBar(props: ActionBarProps): JSX.Element {
  return (
    <div className="flex flex-col w-full" style={{ gap: 8 }}>
      <Btn onClick={props.onSubmit} disabled={!props.canSubmit} variant="primary" large>
        Submit
      </Btn>
      <div className="grid grid-cols-2" style={{ gap: 8 }}>
        <Btn onClick={props.onRecall} disabled={!props.hasPending}>Recall</Btn>
        <Btn onClick={props.onShuffle}>Shuffle</Btn>
        <Btn onClick={props.onSwap} disabled={!props.canSwap}>Swap</Btn>
        <Btn onClick={props.onPass}>Pass</Btn>
      </div>
      <Btn onClick={props.onResign} variant="danger">Resign</Btn>
    </div>
  );
}
