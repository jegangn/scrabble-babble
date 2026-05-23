import { tokens } from "../../tokens.js";
import { Button } from "../../components/Button.js";

export interface PhoneActionBarProps {
  readonly pendingCount: number;
  readonly canSwap: boolean;
  readonly onSubmit: () => void;
  readonly onRecall: () => void;
  readonly onShuffle: () => void;
  readonly onSwap: () => void;
  readonly onPass: () => void;
  readonly onResign: () => void;
  /** Whether the resign popover is open. */
  readonly resignOpen: boolean;
  readonly onToggleResign: () => void;
}

/**
 * Bottom action bar for the phone game screen.
 *
 * Layout (left → right):
 *   [Submit · N] [Recall] [Shuffle] [Swap] [Pass] [⋯]
 *
 * Resign lives behind the ⋯ overflow button to keep the bar within one row.
 * All heights ≥ 44 px for iOS tap targets.
 */
export function PhoneActionBar({
  pendingCount,
  canSwap,
  onSubmit,
  onRecall,
  onShuffle,
  onSwap,
  onPass,
  onResign,
  resignOpen,
  onToggleResign,
}: PhoneActionBarProps): JSX.Element {
  const { color, space, radius, shadow, size, weight } = tokens;

  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: color.cream,
        borderTop: `1px solid ${color.strokeSoft}`,
        paddingTop: space.x2,
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        paddingLeft: space.x3,
        paddingRight: space.x3,
        position: "relative",
      }}
    >
      {/* Main row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: space.x2,
        }}
      >
        {/* Submit — wide primary anchor */}
        <Button
          kind="primary"
          size="sm"
          onClick={onSubmit}
          disabled={pendingCount === 0}
          muted
          style={{ flex: "1 1 auto", minWidth: 0 }}
        >
          Submit
          {pendingCount > 0 && (
            <span
              style={{
                marginLeft: 6,
                fontSize: size.micro + 1,
                fontWeight: weight.med,
                opacity: 0.85,
              }}
            >
              · {pendingCount}
            </span>
          )}
        </Button>

        {/* Recall */}
        <Button
          kind="secondary"
          size="sm"
          onClick={onRecall}
          disabled={pendingCount === 0}
          icon={<span>↺</span>}
          ariaLabel="Recall tiles"
          style={{ flexShrink: 0 }}
        >
          {""}
        </Button>

        {/* Shuffle */}
        <Button
          kind="secondary"
          size="sm"
          onClick={onShuffle}
          icon={<span>⇅</span>}
          ariaLabel="Shuffle rack"
          style={{ flexShrink: 0 }}
        >
          {""}
        </Button>

        {/* Swap */}
        <Button
          kind="secondary"
          size="sm"
          onClick={onSwap}
          disabled={!canSwap}
          icon={<span>⇌</span>}
          ariaLabel="Swap tiles"
          style={{ flexShrink: 0 }}
        >
          {""}
        </Button>

        {/* Pass */}
        <Button
          kind="secondary"
          size="sm"
          onClick={onPass}
          ariaLabel="Pass"
          style={{ flexShrink: 0 }}
        >
          Pass
        </Button>

        {/* Overflow — resign */}
        <button
          type="button"
          aria-label="More options"
          onClick={onToggleResign}
          style={{
            appearance: "none",
            border: `1.5px solid ${color.stroke}`,
            background: color.paper,
            borderRadius: radius.card,
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            fontSize: size.bodyLg,
            color: color.ink,
            boxShadow: shadow.card,
            touchAction: "manipulation",
          }}
        >
          ⋯
        </button>
      </div>

      {/* Resign popover — appears above the bar */}
      {resignOpen && (
        <>
          {/* Backdrop to close on outside tap */}
          <div
            onClick={onToggleResign}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 90,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: space.x3,
              bottom: "calc(100% + 6px)",
              zIndex: 91,
              background: color.paper,
              border: `1.5px solid ${color.stroke}`,
              borderRadius: radius.card,
              boxShadow: shadow.modal,
              padding: space.x2,
              minWidth: 140,
            }}
          >
            <button
              type="button"
              onClick={() => {
                onToggleResign();
                onResign();
              }}
              style={{
                appearance: "none",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: `${space.x2}px ${space.x3}px`,
                color: color.danger,
                fontSize: size.body,
                fontWeight: weight.med,
                borderRadius: radius.chip,
                touchAction: "manipulation",
              }}
            >
              Resign game
            </button>
          </div>
        </>
      )}
    </div>
  );
}
