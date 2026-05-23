import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { getBotMove } from "../../../ai-client/botClient.js";
import type { Letter, Position } from "../../../engine/types.js";
import { useGameStore } from "../../../store/gameStore.js";
import { applyPendingToBoard, pendingKeys } from "../../../store/pending.js";
import { usePendingPreview } from "../../hooks/usePendingPreview.js";
import { useLastMove } from "../../hooks/useLastMove.js";
import { tokens } from "../../tokens.js";
import { BlankLetterPicker } from "../../components/BlankLetterPicker.js";
import { Board } from "../../components/Board.js";
import { Button } from "../../components/Button.js";
import { ModalFrame } from "../../components/ModalFrame.js";
import { PlayerCard } from "../../components/PlayerCard.js";
import { Rack } from "../../components/Rack.js";
import { SwapPicker } from "../../components/SwapPicker.js";
import { ThinkingOverlay } from "../../components/ThinkingOverlay.js";
import { Tile } from "../../components/Tile.js";
import { TilesLeft } from "../../components/TilesLeft.js";
import { PhoneShell } from "../PhoneShell.js";
import { PhoneTopBar } from "../components/PhoneTopBar.js";
import { PhoneActionBar } from "../components/PhoneActionBar.js";

/**
 * Portrait phone in-game screen.
 *
 * Layout (top → bottom):
 *   PhoneTopBar    — back + variant label + tiles-left
 *   Player rows    — two compact PlayerCard rows
 *   Status strip   — error / pending preview / last move (1 line each)
 *   Board region   — flex:1, board square fills via cqmin
 *   Rack           — tileSize=44 nowrap, brown felt
 *   PhoneActionBar — Submit + Recall/Shuffle/Swap/Pass + ⋯ (Resign)
 *
 * ALL game logic (drag-drop handlers, blank picker, swap, pass/resign
 * confirms, AI driver effect, DragOverlay) is ported verbatim from
 * GameScreen.tsx — only the surrounding layout differs.
 */
export function PhoneGame(): JSX.Element | null {
  // ── Store ────────────────────────────────────────────────────────
  const game = useGameStore((s) => s.game);
  const dictionary = useGameStore((s) => s.dictionary);
  const pending = useGameStore((s) => s.pending);
  const rackOrder = useGameStore((s) => s.rackOrder);
  const error = useGameStore((s) => s.error);
  const pendingBlankAt = useGameStore((s) => s.pendingBlankAt);
  const aiPlayerIndex = useGameStore((s) => s.aiPlayerIndex);
  const opponent = useGameStore((s) => s.settings.opponent);
  const variant = useGameStore((s) => s.settings.variant);
  const thinking = useGameStore((s) => s.thinking);
  const placeFromRack = useGameStore((s) => s.placeFromRack);
  const movePending = useGameStore((s) => s.movePending);
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

  // ── Local state ──────────────────────────────────────────────────
  const [selectedRackIndex, setSelectedRackIndex] = useState<number | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [confirmPass, setConfirmPass] = useState(false);
  const [resignMenuOpen, setResignMenuOpen] = useState(false);
  const [activeDrag, setActiveDrag] = useState<
    | { kind: "rack"; rackIndex: number }
    | { kind: "pending-board"; position: Position }
    | null
  >(null);

  const dropSuccessfulRef = useRef(false);

  // ── AI driver (verbatim from GameScreen) ─────────────────────────
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
        setThinking(false);
        pass();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.turn, aiPlayerIndex, opponent]);

  // ── Sensors (verbatim from GameScreen) ───────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 12 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 12 } }),
  );

  // ── Drag handlers (verbatim from GameScreen) ─────────────────────
  const onDragStart = (event: DragStartEvent): void => {
    const data = event.active.data.current as
      | { kind: "rack"; rackIndex: number }
      | { kind: "pending-board"; position: Position }
      | undefined;
    if (!data) return;
    if (data.kind === "rack") {
      setActiveDrag({ kind: "rack", rackIndex: data.rackIndex });
    } else if (data.kind === "pending-board") {
      setActiveDrag({ kind: "pending-board", position: data.position });
    }
  };

  const onDragEnd = (event: DragEndEvent): void => {
    const data = event.active.data.current as
      | { kind: "rack"; rackIndex: number }
      | { kind: "pending-board"; position: Position }
      | undefined;
    const over = event.over?.data.current as
      | { kind: string; position?: Position }
      | undefined;
    const droppedOnCell = over?.kind === "cell" && !!over.position;
    dropSuccessfulRef.current = droppedOnCell;
    setActiveDrag(null);
    if (!data || !droppedOnCell || !over?.position) return;
    if (data.kind === "rack") {
      placeFromRack(data.rackIndex, over.position);
    } else if (data.kind === "pending-board") {
      movePending(data.position, over.position);
    }
  };

  const onDragCancel = (): void => {
    dropSuccessfulRef.current = false;
    setActiveDrag(null);
  };

  // ── Derived board / pending state (verbatim from GameScreen) ─────
  const board = useMemo(
    () => (game ? applyPendingToBoard(game.board, pending) : null),
    [game, pending],
  );
  const keys = useMemo(() => pendingKeys(pending), [pending]);
  const usedRackIndices = useMemo(
    () => new Set(pending.map((p) => p.rackIndex)),
    [pending],
  );

  const pendingPreview = usePendingPreview(game, pending, dictionary);
  const lastMove = useLastMove(game);

  if (!game || !board) return null;

  const player = game.players[game.turn]!;
  const canSwap = game.bag.length >= game.rules.minBagToSwap;
  const variantLabel =
    variant === "classic"
      ? "Classic 15 × 15"
      : variant === "random"
        ? "Random 15 × 15"
        : "Mini 11 × 11";

  // ── Cell/rack tap handlers (verbatim from GameScreen) ─────────────
  const onCellTap = (pos: Position): void => {
    if (selectedRackIndex !== null) {
      placeFromRack(selectedRackIndex, pos);
      setSelectedRackIndex(null);
      return;
    }
    if (keys.has(`${pos.row},${pos.col}` as `${number},${number}`)) {
      recallOne(pos);
    }
  };

  const stableOnCellTap = useCallback(onCellTap, [
    selectedRackIndex,
    keys,
    placeFromRack,
    recallOne,
  ]);

  const onRackTap = (rackIndex: number): void => {
    if (usedRackIndices.has(rackIndex)) return;
    setSelectedRackIndex(selectedRackIndex === rackIndex ? null : rackIndex);
  };

  // ── Drag overlay tile (verbatim from GameScreen) ──────────────────
  type AnyDragTile =
    | { kind: "letter"; letter: Letter; value: number }
    | { kind: "blank"; value: 0 }
    | { kind: "blank"; letter: Letter; value: 0 };
  let activeDragTile: AnyDragTile | null = null;
  if (activeDrag && game) {
    if (activeDrag.kind === "rack") {
      activeDragTile = game.players[game.turn]!.rack[activeDrag.rackIndex] ?? null;
    } else {
      const found = pending.find(
        (p) =>
          p.position.row === activeDrag.position.row &&
          p.position.col === activeDrag.position.col,
      );
      activeDragTile = found?.tile ?? null;
    }
  }

  const { color, space, radius, shadow, size, weight, font } = tokens;

  // ── Status strip helper ───────────────────────────────────────────
  const labelStyle = {
    fontSize: size.micro,
    letterSpacing: ".08em",
    textTransform: "uppercase" as const,
    fontWeight: weight.med,
  };
  const wordStyle = {
    fontSize: size.caption,
    color: color.ink,
    fontFamily: font.serif,
    fontWeight: weight.bold,
    minWidth: 0,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  };
  const rowStyle = {
    display: "flex",
    justifyContent: "space-between" as const,
    alignItems: "baseline" as const,
    gap: space.x3,
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <PhoneShell
        top={
          <PhoneTopBar
            onBack={goHome}
            backLabel="Home"
            title={variantLabel}
            trailing={<TilesLeft count={game.bag.length} />}
          />
        }
      >
        {/* Player rows — compact: tighter padding vs the iPad card */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: space.x1,
            padding: `${space.x2}px ${space.x3}px ${space.x1}px`,
          }}
        >
          {game.players.map((p, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                alignItems: "center",
                gap: space.x3,
                padding: `${space.x2}px ${space.x3}px`,
                background:
                  i === game.turn
                    ? color.paper
                    : `color-mix(in oklab, ${color.paper} 70%, ${color.cream})`,
                border:
                  i === game.turn
                    ? `2px solid ${color.brown}`
                    : `1.5px solid ${color.stroke}`,
                borderRadius: radius.card,
                boxShadow: i === game.turn ? shadow.cardHover : shadow.card,
              }}
            >
              {/* Avatar circle */}
              <span
                aria-hidden
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: i === game.turn ? color.brown : color.brownTint,
                  color: i === game.turn ? color.cream : color.brown,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: font.serif,
                  fontWeight: weight.bold,
                  fontSize: 14,
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                {p.name.charAt(0).toUpperCase()}
                {i === game.turn && (
                  <span
                    style={{
                      position: "absolute",
                      right: -2,
                      bottom: -2,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: color.success,
                      border: `2px solid ${color.paper}`,
                    }}
                  />
                )}
              </span>
              {/* Name + status */}
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span
                  style={{
                    fontSize: size.caption,
                    fontWeight: weight.med,
                    color: color.ink,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                  {aiPlayerIndex === i && opponent.kind === "ai" && (
                    <span
                      style={{
                        fontSize: size.micro,
                        color: color.inkSoft,
                        marginLeft: 6,
                        fontWeight: weight.reg,
                      }}
                    >
                      · AI
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontSize: size.micro,
                    color: i === game.turn ? color.success : color.inkSoft,
                    textTransform: "uppercase",
                    letterSpacing: ".07em",
                    fontWeight: weight.med,
                  }}
                >
                  {i === game.turn ? "Your turn" : "Waiting"}
                </span>
              </span>
              {/* Score */}
              <span
                style={{
                  fontSize: size.body,
                  fontWeight: weight.bold,
                  color: i === game.turn ? color.brown : color.ink,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {p.score}
              </span>
            </div>
          ))}
        </div>

        {/* Status strip — compact 1-line (error > pending > last) */}
        <div
          style={{
            flexShrink: 0,
            paddingLeft: space.x3,
            paddingRight: space.x3,
            paddingBottom: space.x1,
          }}
        >
          {(() => {
            if (error) {
              return (
                <div
                  role="alert"
                  style={{
                    padding: `${space.x1}px ${space.x3}px`,
                    background: color.dangerBg,
                    border: `1.5px solid ${color.danger}`,
                    borderRadius: radius.card,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <span style={{ ...labelStyle, color: color.danger }}>Try again</span>
                  <div style={rowStyle}>
                    <span style={wordStyle}>
                      {pendingPreview?.word.toUpperCase() ?? "—"}
                    </span>
                    <span
                      style={{
                        fontSize: size.micro,
                        color: color.danger,
                        fontWeight: weight.med,
                        textAlign: "right",
                      }}
                    >
                      {error}
                    </span>
                  </div>
                </div>
              );
            }
            if (pendingPreview) {
              return (
                <div
                  style={{
                    padding: `${space.x1}px ${space.x3}px`,
                    background: color.successBg,
                    border: `1.5px solid ${color.success}`,
                    borderRadius: radius.card,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <span style={{ ...labelStyle, color: color.success }}>Pending</span>
                  <div style={rowStyle}>
                    <span style={wordStyle}>{pendingPreview.word.toUpperCase()}</span>
                    <span
                      style={{
                        fontSize: size.caption,
                        color:
                          pendingPreview.score === null ? color.inkSoft : color.success,
                        fontWeight: weight.med,
                      }}
                    >
                      {pendingPreview.score === null
                        ? "Composing…"
                        : `+${pendingPreview.score}`}
                    </span>
                  </div>
                </div>
              );
            }
            if (lastMove) {
              return (
                <div
                  style={{
                    padding: `${space.x1}px ${space.x3}px`,
                    background: color.paper,
                    border: `1.5px solid ${color.stroke}`,
                    borderRadius: radius.card,
                    boxShadow: shadow.card,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <span style={{ ...labelStyle, color: color.inkSoft }}>
                    Last · {lastMove.name}
                  </span>
                  <div style={rowStyle}>
                    {/* lastMove.word may be null (pass/swap history entry) */}
                    <span style={wordStyle}>
                      {lastMove.word != null ? lastMove.word.toUpperCase() : "—"}
                    </span>
                    <span
                      style={{
                        fontSize: size.caption,
                        color: color.brown,
                        fontWeight: weight.med,
                      }}
                    >
                      +{lastMove.score}
                    </span>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Board region — flex:1 so it fills remaining height */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: `0 ${space.x3}px`,
            // Size container so the inner square can use cqmin
            containerType: "size",
          }}
        >
          <div
            style={{
              width: "100cqmin",
              height: "100cqmin",
              containerType: "size",
              containerName: "board",
            }}
          >
            <Board board={board} pendingKeys={keys} onCellTap={stableOnCellTap} />
          </div>
        </div>

        {/* Rack — single nowrap row */}
        <div
          style={{
            flexShrink: 0,
            padding: `${space.x2}px ${space.x3}px`,
          }}
        >
          <Rack
            rack={player.rack}
            rackOrder={rackOrder}
            usedIndices={usedRackIndices}
            onTileTap={onRackTap}
            selectedIndex={selectedRackIndex}
            tileSize={44}
            wrap={false}
          />
        </div>

        {/* Action bar */}
        <PhoneActionBar
          pendingCount={pending.length}
          canSwap={canSwap}
          onSubmit={submitMove}
          onRecall={() => {
            recallPending();
            setSelectedRackIndex(null);
          }}
          onShuffle={shuffleRack}
          onSwap={() => setSwapping(true)}
          onPass={() => setConfirmPass(true)}
          onResign={() => setConfirmResign(true)}
          resignOpen={resignMenuOpen}
          onToggleResign={() => setResignMenuOpen((v) => !v)}
        />
      </PhoneShell>

      {/* ── Modals + overlays (verbatim from GameScreen) ───────────── */}
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
      {confirmPass && (
        <ModalFrame
          title="Pass your turn?"
          sub="You'll skip this turn without placing any tiles."
          onClose={() => setConfirmPass(false)}
          footer={
            <>
              <Button kind="ghost" onClick={() => setConfirmPass(false)}>
                Keep playing
              </Button>
              <Button
                kind="primary"
                onClick={() => {
                  setConfirmPass(false);
                  pass();
                }}
              >
                Pass turn
              </Button>
            </>
          }
        >
          <div
            style={{
              padding: space.x4,
              background: color.warnBg,
              borderRadius: radius.chip,
              color: color.brownDark,
              fontSize: size.caption,
              fontWeight: weight.med,
              lineHeight: 1.5,
            }}
          >
            Four passes in a row (two by each player) end the game.
          </div>
        </ModalFrame>
      )}
      {confirmResign && (
        <ModalFrame
          title="End the game?"
          sub="Your opponent will take the win. This can't be undone."
          danger
          onClose={() => setConfirmResign(false)}
          footer={
            <>
              <Button kind="ghost" onClick={() => setConfirmResign(false)}>
                Keep playing
              </Button>
              <Button
                kind="destructive"
                onClick={() => {
                  setConfirmResign(false);
                  resign();
                }}
              >
                End game now
              </Button>
            </>
          }
        >
          <div
            style={{
              padding: space.x4,
              background: color.dangerBg,
              borderRadius: radius.chip,
              color: color.danger,
              fontSize: size.caption,
              fontWeight: weight.med,
              lineHeight: 1.5,
            }}
          >
            Resigning is final. The current score stands and the round is marked as
            a win for the other player.
          </div>
        </ModalFrame>
      )}
      {thinking && <ThinkingOverlay />}

      <DragOverlay
        dropAnimation={
          dropSuccessfulRef.current
            ? null
            : { duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        }
        zIndex={400}
      >
        {activeDragTile && (
          <div
            style={{
              width: 44,
              height: 44,
              transform: "scale(1.1)",
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
              cursor: "grabbing",
              pointerEvents: "none",
            }}
          >
            <Tile tile={activeDragTile} placed />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
