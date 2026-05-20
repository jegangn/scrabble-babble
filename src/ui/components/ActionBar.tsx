import { tokens } from "../tokens.js";
import { Button } from "./Button.js";

export interface ActionBarProps {
  readonly canSubmit: boolean;
  readonly hasPending: boolean;
  /** Number of tiles placed but not yet submitted — shown on the Submit button. */
  readonly placedCount: number;
  /** False when the bag is too small to swap (rules.minBagToSwap floor). */
  readonly canSwap: boolean;
  readonly onSubmit: () => void;
  readonly onRecall: () => void;
  readonly onShuffle: () => void;
  readonly onSwap: () => void;
  readonly onPass: () => void;
  readonly onResign: () => void;
}

/**
 * Horizontal action row that sits below the rack in the in-game bottom
 * strip. Layout per the handoff:
 *
 *   [Shuffle] [Swap] [Pass] [Resign]    [Recall*] [Submit · N]
 *                                  ↑ flex spacer pushes Submit right
 *
 * Submit is the only primary button; Resign is destructive; Recall is a
 * ghost button that only renders when there are pending placements.
 * Shuffle / Swap / Pass / Submit all play their own action sounds via
 * the click handlers in gameStore — the Button component is `muted`
 * for those so the soft UI-tap doesn't double up on the action sound.
 */
export function ActionBar({
  canSubmit,
  hasPending,
  placedCount,
  canSwap,
  onSubmit,
  onRecall,
  onShuffle,
  onSwap,
  onPass,
  onResign,
}: ActionBarProps): JSX.Element {
  const { space, size, weight } = tokens;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: space.x3,
        flexWrap: "wrap",
      }}
    >
      <Button kind="secondary" onClick={onShuffle} icon={<span>⇅</span>}>
        Shuffle
      </Button>
      <Button kind="secondary" onClick={onSwap} disabled={!canSwap} icon={<span>⇌</span>}>
        Swap
      </Button>
      <Button kind="secondary" onClick={onPass}>
        Pass
      </Button>
      <Button kind="destructive" onClick={onResign}>
        Resign
      </Button>

      {/* Flex spacer pushes Recall + Submit to the right edge. */}
      <div style={{ flex: 1, minWidth: space.x4 }} />

      {hasPending && (
        <Button kind="ghost" onClick={onRecall} icon={<span>↺</span>}>
          Recall
        </Button>
      )}
      <Button kind="primary" onClick={onSubmit} disabled={!canSubmit} muted>
        Submit
        {placedCount > 0 && (
          <span
            style={{
              marginLeft: 8,
              fontSize: size.caption,
              fontWeight: weight.med,
              opacity: 0.85,
            }}
          >
            · {placedCount} tile{placedCount === 1 ? "" : "s"}
          </span>
        )}
      </Button>
    </div>
  );
}
