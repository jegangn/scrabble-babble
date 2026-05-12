import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { getBotMove } from "../../ai-client/botClient.js";
import { useGameStore } from "../../store/gameStore.js";
import { applyPendingToBoard, pendingKeys } from "../../store/pending.js";
import { ActionBar } from "../components/ActionBar.js";
import { BlankLetterPicker } from "../components/BlankLetterPicker.js";
import { Board } from "../components/Board.js";
import { Rack } from "../components/Rack.js";
import { ScoreBar } from "../components/ScoreBar.js";
import { SwapPicker } from "../components/SwapPicker.js";
import { Modal } from "../components/Modal.js";
import { ThinkingOverlay } from "../components/ThinkingOverlay.js";
import { ACCENT } from "../theme.js";
import type { Position } from "../../engine/types.js";

export function GameScreen(): JSX.Element | null {
  const game = useGameStore((s) => s.game);
  const pending = useGameStore((s) => s.pending);
  const rackOrder = useGameStore((s) => s.rackOrder);
  const error = useGameStore((s) => s.error);
  const pendingBlankAt = useGameStore((s) => s.pendingBlankAt);
  const aiPlayerIndex = useGameStore((s) => s.aiPlayerIndex);
  const opponent = useGameStore((s) => s.settings.opponent);
  const thinking = useGameStore((s) => s.thinking);
  const placeFromRack = useGameStore((s) => s.placeFromRack);
  const recallOne = useGameStore((s) => s.recallOne);
  const setBlankLetter = useGameStore((s) => s.setBlankLetter);
  const cancelBlankPicker = useGameStore((s) => s.cancelBlankPicker);
  const submitMove = useGameStore((s) => s.submitMove);
  const recallPending = useGameStore((s) => s.recallPending);
  const shuffleRack = useGameStore((s) => s.shuffleRack);
  const swap = useGameStore((s) => s.swap);
  const pass = useGameStore((s) => s.pass);
  const resign = useGameStore((s) => s.resign);
  const applyAiMove = useGameStore((s) => s.applyAiMove);
  const setThinking = useGameStore((s) => s.setThinking);
  const goHome = useGameStore((s) => s.goHome);

  const [selectedRackIndex, setSelectedRackIndex] = useState<number | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);

  // Drive the bot when it's the AI's turn. The effect fires once per turn
  // change (game.turn is the trigger). `thinking` is intentionally NOT in the
  // dep array: that flag is set INSIDE the effect, so listing it would cause
  // the effect to immediately re-mount and the cleanup would cancel the very
  // task it just started — leaving the thinking overlay stuck forever after
  // the worker's response is discarded.
  useEffect(() => {
    if (!game) return;
    if (game.status.kind === "ended") return;
    if (aiPlayerIndex === null || game.turn !== aiPlayerIndex) return;
    if (opponent.kind !== "ai") return;

    let cancelled = false;
    setThinking(true);
    void (async () => {
      try {
        const move = await getBotMove(game, opponent.difficulty);
        if (cancelled) return;
        applyAiMove(move);
      } catch (err) {
        console.error("Bot error", err);
        if (cancelled) return;
        // Worker failed; pass on the bot's behalf so the game keeps moving.
        setThinking(false);
        pass();
      }
    })();
    return () => {
      cancelled = true;
    };
    // Stable deps: turn / who-controls-AI / opponent identity. We don't
    // depend on the entire `game` object — a bot turn is uniquely identified
    // by whose turn it is plus the AI slot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.turn, aiPlayerIndex, opponent]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const data = event.active.data.current as { kind: string; rackIndex?: number } | undefined;
    const over = event.over?.data.current as { kind: string; position?: Position } | undefined;
    if (data?.kind !== "rack" || over?.kind !== "cell" || !over.position) return;
    if (typeof data.rackIndex !== "number") return;
    placeFromRack(data.rackIndex, over.position);
  };

  if (!game) return null;

  const player = game.players[game.turn]!;
  const board = useMemo(() => applyPendingToBoard(game.board, pending), [game.board, pending]);
  const keys = useMemo(() => pendingKeys(pending), [pending]);
  const usedRackIndices = useMemo(
    () => new Set(pending.map((p) => p.rackIndex)),
    [pending],
  );

  const onCellTap = (pos: Position) => {
    // If a tile is selected from the rack, place it.
    if (selectedRackIndex !== null) {
      placeFromRack(selectedRackIndex, pos);
      setSelectedRackIndex(null);
      return;
    }
    // Otherwise: if cell is pending, recall.
    if (keys.has(`${pos.row},${pos.col}` as `${number},${number}`)) {
      recallOne(pos);
    }
  };

  const onRackTap = (rackIndex: number) => {
    if (usedRackIndices.has(rackIndex)) return;
    setSelectedRackIndex(selectedRackIndex === rackIndex ? null : rackIndex);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
    <div
      className="flex flex-col h-full w-full p-3"
      style={{ background: ACCENT.surface, gap: 12 }}
    >
      <ScoreBar players={game.players} turn={game.turn} bagCount={game.bag.length} />

      <div className="flex flex-1 gap-3 min-h-0 items-stretch">
        <div className="flex-1 min-w-0 flex items-center justify-center">
          {/*
            Layout note: the wrapper needs an explicit `height: 100%` for
            the aspect-ratio-driven square to fill the column vertically. With
            only `max-height: 100%` (the previous implementation) the wrapper
            collapsed to its empty content, leaving the board at ~30% of the
            screen — a serious eyesight regression for older users.
          */}
          <div
            style={{
              height: "100%",
              aspectRatio: "1",
              maxWidth: "100%",
              containerType: "size",
              containerName: "board",
            }}
          >
            <Board board={board} pendingKeys={keys} onCellTap={onCellTap} />
          </div>
        </div>

        <div
          className="flex flex-col gap-3 items-stretch justify-center"
          style={{ width: 300, flexShrink: 0 }}
        >
          {/* Rack wraps to 4+3 to keep the right column narrow and the board large. */}
          <Rack
            rack={player.rack}
            rackOrder={rackOrder}
            usedIndices={usedRackIndices}
            onTileTap={onRackTap}
            selectedIndex={selectedRackIndex}
          />
          {error && (
            <div
              style={{
                background: "#fff0f0",
                color: ACCENT.danger,
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: "0.95em",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}
          <ActionBar
            canSubmit={pending.length > 0}
            hasPending={pending.length > 0}
            onSubmit={submitMove}
            onRecall={() => {
              recallPending();
              setSelectedRackIndex(null);
            }}
            onShuffle={shuffleRack}
            onSwap={() => setSwapping(true)}
            onPass={pass}
            onResign={() => setConfirmResign(true)}
          />
          <button
            type="button"
            onClick={goHome}
            style={{
              background: "transparent",
              color: ACCENT.text,
              opacity: 0.7,
              padding: "8px 12px",
              fontSize: "0.95em",
            }}
          >
            Back to home
          </button>
        </div>
      </div>

      {pendingBlankAt && (
        <BlankLetterPicker onPick={setBlankLetter} onCancel={cancelBlankPicker} />
      )}
      {swapping && (
        <SwapPicker
          rack={player.rack}
          onConfirm={(tiles) => {
            setSwapping(false);
            swap(tiles);
          }}
          onCancel={() => setSwapping(false)}
        />
      )}
      {confirmResign && (
        <Modal title="Resign?" onClose={() => setConfirmResign(false)}>
          <p>This ends the game and your opponent wins.</p>
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => setConfirmResign(false)}
              style={modalBtn("secondary")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmResign(false);
                resign();
              }}
              style={modalBtn("danger")}
            >
              Resign
            </button>
          </div>
        </Modal>
      )}
      {thinking && <ThinkingOverlay />}
    </div>
    </DndContext>
  );
}

function modalBtn(variant: "secondary" | "danger"): React.CSSProperties {
  return {
    flex: 1,
    background: variant === "danger" ? ACCENT.danger : "white",
    color: variant === "danger" ? "white" : ACCENT.text,
    border: variant === "danger" ? "none" : `2px solid ${ACCENT.primary}`,
    padding: "12px 16px",
    fontSize: "1em",
    fontWeight: 600,
    borderRadius: 8,
    minHeight: 48,
    touchAction: "manipulation",
  };
}
