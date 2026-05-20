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
import { getBotMove } from "../../ai-client/botClient.js";
import { scorePlaceMove } from "../../engine/scorer.js";
import { validatePlaceMove } from "../../engine/validator.js";
import type { Letter, Position } from "../../engine/types.js";
import { useGameStore } from "../../store/gameStore.js";
import { applyPendingToBoard, pendingKeys, pendingToMove } from "../../store/pending.js";
import { tokens } from "../tokens.js";
import { ActionBar } from "../components/ActionBar.js";
import { BackPill } from "../components/BackPill.js";
import { BlankLetterPicker } from "../components/BlankLetterPicker.js";
import { Board } from "../components/Board.js";
import { Button } from "../components/Button.js";
import { ModalFrame } from "../components/ModalFrame.js";
import { PlayerCard } from "../components/PlayerCard.js";
import { Rack } from "../components/Rack.js";
import { SectionLabel } from "../components/SectionLabel.js";
import { SwapPicker } from "../components/SwapPicker.js";
import { Tagline } from "../components/Tagline.js";
import { ThinkingOverlay } from "../components/ThinkingOverlay.js";
import { Tile } from "../components/Tile.js";
import { TilesLeft } from "../components/TilesLeft.js";
import { Toast } from "../components/Toast.js";
import { UserChip } from "../components/UserChip.js";

/**
 * In-game screen — rebuilt per the design handoff.
 *
 * Layout (iPad landscape, 1180 × 820):
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ ←Home                                              UserChip │
 *   │                                                              │
 *   │   ┌──── Board ────┐    Match · {variant}        38 left      │
 *   │   │               │    [PlayerCard A]                        │
 *   │   │               │    [PlayerCard B]                        │
 *   │   │               │    [Last move · Margaret]                │
 *   │   │               │    [Pending word preview, moss]          │
 *   │   └───────────────┘                                          │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ [Rack horizontal]              [Shuffle][Swap][Pass][Resign] │
 *   │                                      [Recall*][Submit · N]   │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Drag/drop, blank-picker, swap modal, resign-confirm modal, AI driver,
 * thinking overlay, and portrait warning are all preserved — only the
 * surrounding layout + chrome have been re-skinned.
 *
 * New features (per Q1 decision): last-move chip + pending-word preview
 * card. Both read from existing engine state (`game.history` and
 * `pending`) — no schema changes.
 */
export function GameScreen(): JSX.Element | null {
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
  const currentUser = useGameStore((s) => s.currentUser);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);
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

  const [selectedRackIndex, setSelectedRackIndex] = useState<number | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  // Tracks the in-flight drag (if any) so <DragOverlay> can render a
  // moving tile that follows the cursor. See the original implementation
  // notes for why both sources matter.
  const [activeDrag, setActiveDrag] = useState<
    | { kind: "rack"; rackIndex: number }
    | { kind: "pending-board"; position: Position }
    | null
  >(null);

  // Drop-success ref — mutated synchronously in onDragEnd before clearing
  // active drag so the next <DragOverlay> render sees the fresh value.
  const dropSuccessfulRef = useRef(false);

  // AI driver — same as before. Dep list intentionally minimal; see the
  // detailed comment in the original implementation.
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

  // Drag thresholds bumped to 12 px so an older user's shaky hand reads
  // as a tap rather than an ambiguous drag — matches the original.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 12 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 12 } }),
  );

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

  // Hooks before any early return — Rules of Hooks.
  const board = useMemo(
    () => (game ? applyPendingToBoard(game.board, pending) : null),
    [game, pending],
  );
  const keys = useMemo(() => pendingKeys(pending), [pending]);
  const usedRackIndices = useMemo(
    () => new Set(pending.map((p) => p.rackIndex)),
    [pending],
  );

  /**
   * Pending-word preview — computes the word + projected score for the
   * tiles the user has placed but not yet submitted. Returns:
   *   - { word, score: number } when the placement is a legal move,
   *   - { word, score: null }   when letters are placed but not (yet) legal,
   *   - null                    when nothing is pending.
   */
  const pendingPreview = useMemo(() => {
    if (pending.length === 0 || !game || !dictionary) return null;
    const move = pendingToMove(pending);
    const validation = validatePlaceMove(game, move, dictionary);
    if (!validation.ok) {
      // Best-effort: show the letters the user has placed, in placement
      // order, so they at least see "what they're building" even if it's
      // not yet a legal move.
      const partial = pending
        .map((p) =>
          p.tile.kind === "letter"
            ? p.tile.letter
            : "letter" in p.tile && typeof p.tile.letter === "string"
              ? p.tile.letter
              : "?",
        )
        .join("");
      return { word: partial, score: null as number | null };
    }
    const score = scorePlaceMove(game, move);
    // ScoreResult.mainWord is a WordScore object — destructure to the
    // string + use the result's total.
    return { word: score.mainWord.word, score: score.total as number | null };
  }, [pending, game, dictionary]);

  /**
   * Last-move chip data. Pulls the most recent place-move from history;
   * passes / swaps / resigns don't surface here because there's no word
   * to display. Returns null on the opening turn or when the most recent
   * action wasn't a place.
   */
  const lastMove = useMemo(() => {
    if (!game) return null;
    for (let i = game.history.length - 1; i >= 0; i--) {
      const entry = game.history[i]!;
      if (entry.move.kind === "place") {
        const player = game.players[entry.playerIndex]!;
        return { word: entry.mainWord, score: entry.score, name: player.name };
      }
    }
    return null;
  }, [game]);

  if (!game || !board) return null;

  const player = game.players[game.turn]!;
  const canSwap = game.bag.length >= game.rules.minBagToSwap;
  const variantLabel =
    variant === "classic" ? "Classic 15 × 15" : variant === "random" ? "Random 15 × 15" : "Mini 11 × 11";

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

  // useCallback-equivalent: stable reference for BoardCell.memo. We don't
  // bother memoising further because onCellTap closes over selectedRackIndex
  // which changes per tap anyway — the memo would invalidate every render.
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

  // Resolve drag-overlay tile from rack or pending.
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

  const { color, space, radius, shadow, font, size, weight } = tokens;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <style>{`
        @media (orientation: portrait) {
          .gs-portrait-warning { display: flex !important; }
          .gs-game-body { display: none; }
        }
      `}</style>

      {/* Portrait warning — kept as-is from the previous implementation. */}
      <div
        className="gs-portrait-warning"
        style={{
          display: "none",
          position: "fixed",
          inset: 0,
          zIndex: 300,
          background: color.cream,
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 24,
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ fontSize: "4em" }}>↻</div>
        <div style={{ fontSize: size.h4, fontWeight: weight.bold, color: color.brown }}>
          Rotate to landscape
        </div>
        <div style={{ opacity: 0.7 }}>
          The Scrabble board needs the wide side of your screen.
        </div>
      </div>

      <div
        className="gs-game-body"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          minHeight: "100%",
          background: color.cream,
          // Grain layer is decorative; rendered as a fixed underlay.
        }}
      >
        {/* Decorative paper grain — matches every other screen. */}
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            opacity: tokens.grain.opacity,
            backgroundImage: tokens.grain.image,
            backgroundSize: tokens.grain.size,
            backgroundPosition: tokens.grain.position,
            zIndex: 0,
          }}
        />

        <BackPill onClick={goHome} />
        {currentUser && (
          <UserChip
            name={currentUser}
            onClick={() => {
              // Tapping the chip on the in-game screen has no place to go
              // (changing name mid-game would be confusing). For now we
              // re-show the prompt on Home only; here it's a no-op visual.
              setCurrentUser(currentUser);
            }}
          />
        )}

        {/* Top: board + sidebar */}
        <div
          style={{
            flex: 1,
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: "minmax(0, auto) 320px",
            gap: space.x8,
            padding: `${space.x16}px ${space.x8}px ${space.x4}px`,
            alignItems: "start",
          }}
        >
          {/* Board column — keeps its container query so tile letters scale
              with the rendered cell size. */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: "min(70vh, 100%)",
                aspectRatio: "1",
                containerType: "size",
                containerName: "board",
              }}
            >
              <Board board={board} pendingKeys={keys} onCellTap={stableOnCellTap} />
            </div>
          </div>

          {/* Sidebar */}
          <aside
            style={{
              display: "flex",
              flexDirection: "column",
              gap: space.x4,
              paddingTop: space.x2,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <Tagline>Match · {variantLabel}</Tagline>
              <TilesLeft count={game.bag.length} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: space.x3 }}>
              {game.players.map((p, i) => (
                <PlayerCard
                  key={i}
                  name={p.name}
                  score={p.score}
                  active={i === game.turn}
                  isAI={aiPlayerIndex === i}
                />
              ))}
            </div>

            {lastMove && (
              <div
                style={{
                  padding: `${space.x3}px ${space.x4}px`,
                  background: color.paper,
                  border: `1.5px solid ${color.stroke}`,
                  borderRadius: radius.card,
                  boxShadow: shadow.card,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: size.micro + 1,
                    color: color.inkSoft,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    fontWeight: weight.med,
                  }}
                >
                  Last move · {lastMove.name}
                </span>
                <span
                  style={{
                    fontSize: size.body,
                    color: color.ink,
                    fontFamily: font.serif,
                    fontWeight: weight.bold,
                  }}
                >
                  {lastMove.word} · +{lastMove.score}
                </span>
              </div>
            )}

            {pendingPreview && (
              <div
                style={{
                  padding: `${space.x3}px ${space.x4}px`,
                  background: color.successBg,
                  border: `1.5px solid ${color.success}`,
                  borderRadius: radius.card,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: size.micro + 1,
                    color: color.success,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    fontWeight: weight.med,
                  }}
                >
                  Pending
                </span>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontSize: size.bodyLg,
                      color: color.ink,
                      fontFamily: font.serif,
                      fontWeight: weight.bold,
                    }}
                  >
                    {pendingPreview.word.toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontSize: size.body,
                      color: pendingPreview.score === null ? color.inkSoft : color.success,
                      fontWeight: weight.med,
                    }}
                  >
                    {pendingPreview.score === null ? "Composing…" : `+${pendingPreview.score}`}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Toast kind="error" title={error} />
              </div>
            )}
          </aside>
        </div>

        {/* Bottom: rack + action bar */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: `${space.x4}px ${space.x8}px ${space.x6}px`,
            display: "flex",
            flexDirection: "column",
            gap: space.x4,
            borderTop: `1px solid ${color.creamDark}`,
            background: `color-mix(in oklab, ${color.cream} 60%, ${color.paper})`,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: space.x6,
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <Rack
              rack={player.rack}
              rackOrder={rackOrder}
              usedIndices={usedRackIndices}
              onTileTap={onRackTap}
              selectedIndex={selectedRackIndex}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                alignItems: "flex-end",
              }}
            >
              <Tagline style={{ margin: 0, fontSize: size.micro + 1 }}>Your rack</Tagline>
              <span style={{ fontSize: size.caption, color: color.inkSoft }}>
                Tap a tile, then tap a square
              </span>
            </div>
          </div>
          <ActionBar
            canSubmit={pending.length > 0}
            hasPending={pending.length > 0}
            placedCount={pending.length}
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
        </div>
      </div>

      {/* Modals + overlays */}
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
            }}
          >
            <SectionLabel style={{ margin: 0, color: color.danger }}>
              Resign
            </SectionLabel>
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
              width: 64,
              height: 64,
              transform: "scale(1.1)",
              filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.3))",
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
