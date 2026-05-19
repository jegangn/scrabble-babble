import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
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
import { Tile } from "../components/Tile.js";
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
  // Tracks which rack slot is currently being dragged so the <DragOverlay>
  // can render a moving tile that follows the cursor. Without this overlay
  // the original tile sat at its rack slot with opacity 0 — the user saw
  // *nothing* moving with their finger. With it, the overlay is mounted
  // at <body> level (escapes overflow clipping) and slides smoothly.
  const [activeDragRackIndex, setActiveDragRackIndex] = useState<number | null>(null);

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

  // Drag thresholds bumped from 8 → 12 px so a shaky older-user hand on iPad
  // is more reliably interpreted as a tap (placement via tap-to-place) rather
  // than an ambiguous drag that doesn't reach a drop target.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 12 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 12 } }),
  );

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { kind: string; rackIndex?: number } | undefined;
    if (data?.kind === "rack" && typeof data.rackIndex === "number") {
      setActiveDragRackIndex(data.rackIndex);
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDragRackIndex(null);
    const data = event.active.data.current as { kind: string; rackIndex?: number } | undefined;
    const over = event.over?.data.current as { kind: string; position?: Position } | undefined;
    if (data?.kind !== "rack" || over?.kind !== "cell" || !over.position) return;
    if (typeof data.rackIndex !== "number") return;
    placeFromRack(data.rackIndex, over.position);
  };

  const onDragCancel = () => {
    setActiveDragRackIndex(null);
  };

  // NOTE: these useMemo calls were previously placed *after* `if (!game) return
  // null` — a Rules-of-Hooks violation. Today the flow never reaches GameScreen
  // with `game === null`, but any future bug that nulls game while this
  // component is mounted would throw "Rendered fewer hooks than expected".
  // Hoisted above the early return; each tolerates a null game.
  const board = useMemo(
    () => (game ? applyPendingToBoard(game.board, pending) : null),
    [game, pending],
  );
  const keys = useMemo(() => pendingKeys(pending), [pending]);
  const usedRackIndices = useMemo(
    () => new Set(pending.map((p) => p.rackIndex)),
    [pending],
  );

  if (!game || !board) return null;

  const player = game.players[game.turn]!;
  const canSwap = game.bag.length >= game.rules.minBagToSwap;

  // useCallback so BoardCell's React.memo can skip re-rendering cells whose
  // own props haven't changed when a single tile is placed.
  const onCellTap = useCallback(
    (pos: Position) => {
      if (selectedRackIndex !== null) {
        placeFromRack(selectedRackIndex, pos);
        setSelectedRackIndex(null);
        return;
      }
      if (keys.has(`${pos.row},${pos.col}` as `${number},${number}`)) {
        recallOne(pos);
      }
    },
    [selectedRackIndex, keys, placeFromRack, recallOne],
  );

  const onRackTap = (rackIndex: number) => {
    if (usedRackIndices.has(rackIndex)) return;
    setSelectedRackIndex(selectedRackIndex === rackIndex ? null : rackIndex);
  };

  // Resolve the actual tile object for the in-flight drag (if any) so the
  // overlay can render it. Reading from game.players[turn].rack keeps the
  // overlay in sync with the source of truth, no separate copy needed.
  const activeDragTile =
    activeDragRackIndex !== null && game
      ? game.players[game.turn]!.rack[activeDragRackIndex] ?? null
      : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
    {/*
      Portrait warning: GameScreen's layout assumes a landscape flex-row
      (board on the left, rack column on the right). In portrait the board
      collapses to a thin strip. The installed-PWA manifest pins landscape,
      but pre-install in mobile Safari there's no orientation lock. CSS
      media query overlays a "Please rotate" message in portrait only.
    */}
    <style>{`
      @media (orientation: portrait) {
        .gs-portrait-warning { display: flex !important; }
        .gs-game-body { display: none; }
      }
    `}</style>
    <div
      className="gs-portrait-warning"
      style={{
        display: "none",
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: ACCENT.surface,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ fontSize: "4em" }}>↻</div>
      <div style={{ fontSize: "1.4em", fontWeight: 700, color: ACCENT.primary }}>
        Rotate to landscape
      </div>
      <div style={{ opacity: 0.7 }}>
        The Scrabble board needs the wide side of your screen.
      </div>
    </div>
    <div
      className="gs-game-body flex flex-col h-full w-full p-3"
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
            canSwap={canSwap}
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
            {/*
              Confirm button text is intentionally NOT "Resign" — that's the
              same word the user just tapped (in the action bar) to open this
              modal. Identical-looking buttons invite second-tap mistakes from
              older users. "End game now" is more deliberate and destructive.
            */}
            <button
              type="button"
              onClick={() => {
                setConfirmResign(false);
                resign();
              }}
              style={modalBtn("danger")}
            >
              End game now
            </button>
          </div>
        </Modal>
      )}
      {thinking && <ThinkingOverlay />}
    </div>
    {/*
      DragOverlay: mounted at document.body via portal, escapes any
      overflow-hidden ancestor (the brown rack, the board grid, the
      score bar). Drag motion is GPU-accelerated transform — no React
      re-renders during the drag itself. dropAnimation handles the
      "snap" when releasing over a valid cell.
    */}
    <DragOverlay
      dropAnimation={{
        duration: 180,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      zIndex={400}
    >
      {activeDragTile && (
        <div
          style={{
            width: 64,
            height: 64,
            // Slight scale-up + drop-shadow gives a tactile "lifted" feel
            // older eyes track better than a flat-following tile.
            transform: "scale(1.1)",
            filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.3))",
            cursor: "grabbing",
            pointerEvents: "none",
          }}
        >
          <Tile tile={activeDragTile} pending />
        </div>
      )}
    </DragOverlay>
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
