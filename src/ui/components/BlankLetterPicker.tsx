import type { Letter } from "../../engine/types.js";
import { playUiTap } from "../../audio/sounds.js";
import { ACCENT } from "../theme.js";
import { Modal } from "./Modal.js";

const LETTERS: ReadonlyArray<Letter> = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M",
  "N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
];

export interface BlankLetterPickerProps {
  readonly onPick: (letter: Letter) => void;
  readonly onCancel: () => void;
}

export function BlankLetterPicker({ onPick, onCancel }: BlankLetterPickerProps): JSX.Element {
  const pick = (l: Letter) => {
    playUiTap();
    onPick(l);
  };
  const cancel = () => {
    playUiTap();
    onCancel();
  };
  // NOTE: deliberately NOT passing onClose to Modal. A stray backdrop-tap on
  // iPad would silently discard the placed blank (cancelBlankPicker removes the
  // pending placement) with no feedback. Force the user to click Cancel
  // explicitly so the action is always intentional.
  return (
    <Modal title="Pick a letter for the blank">
      <div className="grid grid-cols-7 gap-2">
        {LETTERS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => pick(l)}
            className="rounded-md font-bold"
            style={{
              background: "white",
              color: ACCENT.text,
              border: `2px solid ${ACCENT.primary}`,
              minHeight: 48,
              fontSize: "1.2em",
              touchAction: "manipulation",
            }}
          >
            {l}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={cancel}
        className="mt-4 w-full rounded-md font-semibold"
        style={{ background: ACCENT.primary, color: "white", minHeight: 48 }}
      >
        Cancel
      </button>
    </Modal>
  );
}
