import { useState } from "react";
import type { Tile as TileT } from "../../engine/types.js";
import { playUiTap } from "../../audio/sounds.js";
import { tokens } from "../tokens.js";
import { Button } from "./Button.js";
import { ModalFrame } from "./ModalFrame.js";
import { Tile } from "./Tile.js";

export interface SwapPickerProps {
  readonly rack: ReadonlyArray<TileT>;
  readonly onConfirm: (tiles: ReadonlyArray<TileT>) => void;
  readonly onCancel: () => void;
}

/**
 * Swap-tile picker — opens from the in-game Swap button. Lets the user
 * tap tiles in their rack to mark them for swap; tapping again unmarks.
 * Confirm sends the selected tiles to the swap action; the engine
 * draws fresh tiles + advances the turn.
 *
 * Visual treatment per the handoff: rack on a brown felt strip; selected
 * tiles flip to "ghost" outline + show a moss check-circle in the
 * top-right; deselected tiles render as normal cream Scrabble tiles.
 */
export function SwapPicker({
  rack,
  onConfirm,
  onCancel,
}: SwapPickerProps): JSX.Element {
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());

  const toggle = (index: number): void => {
    playUiTap();
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  };

  const confirm = (): void => {
    onConfirm(rack.filter((_, i) => selected.has(i)));
  };

  const cancel = (): void => {
    playUiTap();
    onCancel();
  };

  const { color, radius, space, shadow } = tokens;
  const count = selected.size;

  return (
    <ModalFrame
      title="Swap tiles"
      sub="Pick tiles to exchange. New tiles come from the bag; this counts as your turn."
      onClose={cancel}
      footer={
        <>
          <Button kind="ghost" onClick={cancel}>
            Cancel
          </Button>
          <Button kind="primary" onClick={confirm} disabled={count === 0}>
            Swap {count} tile{count === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: space.x3,
          justifyContent: "center",
          padding: `${space.x3}px ${space.x4}px`,
          background: color.brown,
          borderRadius: radius.card,
          boxShadow: `inset 0 2px 6px rgba(0,0,0,.25), ${shadow.card}`,
        }}
      >
        {rack.map((tile, i) => {
          const isSelected = selected.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              aria-pressed={isSelected}
              style={{
                appearance: "none",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                touchAction: "manipulation",
                position: "relative",
              }}
            >
              <Tile tile={tile} size={64} variant={isSelected ? "ghost" : "cream"} />
              {isSelected && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: color.success,
                    color: color.paper,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    boxShadow: "0 2px 6px rgba(0,0,0,.25)",
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </ModalFrame>
  );
}
