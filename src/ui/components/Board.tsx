import { cellKey } from "../../engine/board.js";
import type { Board as BoardT, CellKey, Position } from "../../engine/types.js";
import { BOARD } from "../theme.js";
import { BoardCell } from "./BoardCell.js";

export interface BoardProps {
  readonly board: BoardT;
  readonly pendingKeys: ReadonlySet<CellKey>;
  readonly onCellTap?: ((position: Position) => void) | undefined;
}

export function Board({ board, pendingKeys, onCellTap }: BoardProps): JSX.Element {
  const size = board.size;
  const center = Math.floor(size / 2);
  return (
    <div
      className="grid w-full h-full"
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        background: BOARD.bg,
        padding: 4,
        gap: 1,
        aspectRatio: "1",
        touchAction: "manipulation",
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
