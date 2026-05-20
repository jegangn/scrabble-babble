import type { Letter } from "../../engine/types.js";
import { playUiTap } from "../../audio/sounds.js";
import { tokens } from "../tokens.js";
import { Button } from "./Button.js";
import { ModalFrame } from "./ModalFrame.js";
import { Tile } from "./Tile.js";

const LETTERS: ReadonlyArray<Letter> = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M",
  "N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
];

export interface BlankLetterPickerProps {
  readonly onPick: (letter: Letter) => void;
  readonly onCancel: () => void;
}

/**
 * Blank-tile letter picker — opens when a blank tile is placed on the
 * board and needs a chosen letter. Renders each letter as a small cream
 * tile in a 7-column grid (matches the handoff's 7×4 layout for the
 * Latin alphabet, with the last row showing 5 letters + a Cancel slot).
 *
 * Backdrop-tap is deliberately disabled: a stray tap would silently
 * discard the placed blank (cancelBlankPicker removes the pending
 * placement) with no feedback. Force the user to click Cancel
 * explicitly so the action is always intentional.
 */
export function BlankLetterPicker({
  onPick,
  onCancel,
}: BlankLetterPickerProps): JSX.Element {
  const pick = (l: Letter): void => {
    playUiTap();
    onPick(l);
  };

  return (
    <ModalFrame
      title="Pick a letter for your blank"
      sub="The blank takes this letter for the rest of the game."
      // No onClose — backdrop dismissal would silently discard the placement.
      footer={
        <Button kind="ghost" onClick={onCancel}>
          Cancel
        </Button>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: tokens.space.x2,
        }}
      >
        {LETTERS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => pick(l)}
            aria-label={`Letter ${l}`}
            style={{
              appearance: "none",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              touchAction: "manipulation",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Tile letter={l} size={56} variant="cream" showValue={false} />
          </button>
        ))}
      </div>
    </ModalFrame>
  );
}
