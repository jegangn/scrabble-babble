import type { Letter } from "../../engine/types.js";
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
  return (
    <Modal title="Pick a letter for the blank" onClose={onCancel}>
      <div className="grid grid-cols-7 gap-2">
        {LETTERS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onPick(l)}
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
        onClick={onCancel}
        className="mt-4 w-full rounded-md font-semibold"
        style={{ background: ACCENT.primary, color: "white", minHeight: 48 }}
      >
        Cancel
      </button>
    </Modal>
  );
}
