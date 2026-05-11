import { useState } from "react";
import type { Tile as TileT } from "../../engine/types.js";
import { ACCENT, TILE } from "../theme.js";
import { Modal } from "./Modal.js";
import { Tile } from "./Tile.js";

export interface SwapPickerProps {
  readonly rack: ReadonlyArray<TileT>;
  readonly onConfirm: (tiles: ReadonlyArray<TileT>) => void;
  readonly onCancel: () => void;
}

export function SwapPicker({ rack, onConfirm, onCancel }: SwapPickerProps): JSX.Element {
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());

  const toggle = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  };

  const confirm = () => {
    onConfirm(rack.filter((_, i) => selected.has(i)));
  };

  return (
    <Modal title="Select tiles to swap" onClose={onCancel}>
      <div className="flex gap-2 justify-center flex-wrap">
        {rack.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            className="rounded-md"
            style={{
              width: 64,
              height: 64,
              padding: 0,
              outline: selected.has(i) ? `3px solid ${TILE.bgPending}` : "none",
              outlineOffset: 2,
              background: "transparent",
              border: "none",
              touchAction: "manipulation",
            }}
          >
            <Tile tile={t} />
          </button>
        ))}
      </div>
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md font-semibold"
          style={{
            background: "white",
            color: ACCENT.text,
            border: `2px solid ${ACCENT.primary}`,
            minHeight: 48,
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={selected.size === 0}
          className="flex-1 rounded-md font-semibold"
          style={{
            background: ACCENT.primary,
            color: "white",
            minHeight: 48,
            opacity: selected.size === 0 ? 0.4 : 1,
          }}
        >
          Swap {selected.size}
        </button>
      </div>
    </Modal>
  );
}
