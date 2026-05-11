import { ACCENT } from "../theme.js";

export interface ActionBarProps {
  readonly canSubmit: boolean;
  readonly hasPending: boolean;
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
}

function Btn({ onClick, children, disabled, variant = "secondary" }: ButtonProps): JSX.Element {
  const styles: Record<NonNullable<ButtonProps["variant"]>, React.CSSProperties> = {
    primary: { background: ACCENT.primary, color: "white" },
    secondary: { background: "white", color: ACCENT.text, border: `2px solid ${ACCENT.primary}` },
    danger: { background: ACCENT.danger, color: "white" },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md font-semibold"
      style={{
        ...styles[variant],
        padding: "10px 14px",
        minHeight: 48,
        opacity: disabled ? 0.4 : 1,
        touchAction: "manipulation",
      }}
    >
      {children}
    </button>
  );
}

export function ActionBar(props: ActionBarProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <Btn onClick={props.onSubmit} disabled={!props.canSubmit} variant="primary">
        Submit
      </Btn>
      <Btn onClick={props.onRecall} disabled={!props.hasPending}>Recall</Btn>
      <Btn onClick={props.onShuffle}>Shuffle</Btn>
      <Btn onClick={props.onSwap}>Swap</Btn>
      <Btn onClick={props.onPass}>Pass</Btn>
      <Btn onClick={props.onResign} variant="danger">Resign</Btn>
    </div>
  );
}
