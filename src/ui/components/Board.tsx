import { cellKey } from "../../engine/board.js";
import type { Board as BoardT, CellKey, Position } from "../../engine/types.js";
import { tokens } from "../tokens.js";
import { BoardCell } from "./BoardCell.js";

export interface BoardProps {
  readonly board: BoardT;
  readonly pendingKeys: ReadonlySet<CellKey>;
  readonly onCellTap?: ((position: Position) => void) | undefined;
}

/**
 * Game-board frame. The board grid is wrapped in a brown "frame" — the
 * same dark colour as the title tile-hero — with a 3 px gap between
 * cells (the handoff uses 3 px, not the previous 1 px, so the muted
 * premium-square colours read as distinct cells rather than a single
 * mottled rectangle).
 *
 * Sizing is responsive: the outer `aspectRatio: 1` square fills its
 * container so the screen layer decides how big the board is. The
 * inner cells fit via `1fr` columns; tile letter + value sizes scale
 * with the cell via cqi units in BoardCell.
 */
export function Board({ board, pendingKeys, onCellTap }: BoardProps): JSX.Element {
  const size = board.size;
  const center = Math.floor(size / 2);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        gap: 3,
        padding: 3,
        background: tokens.color.brown,
        borderRadius: tokens.radius.card,
        boxShadow: `inset 0 0 0 1px ${tokens.color.brownDark}, ${tokens.shadow.card}`,
        width: "100%",
        aspectRatio: "1",
        touchAction: "manipulation",
        // containerType: size for the cqi-based font scaling in BoardCell.
        containerType: "size",
      }}
    >
      {board.cells.flatMap((row, r) =>
        row.map((cell, c) => (
          <BoardCell
            key={cellKey({ row: r, col: c })}
            cell={cell}
            position={{ row: r, col: c }}
            isCenter={r === center && c === center}
            isPending={pendingKeys.has(cellKey({ row: r, col: c }))}
            onTap={onCellTap}
          />
        )),
      )}
    </div>
  );
}
