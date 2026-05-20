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
import { BackPill } from "../components/BackPill.js";
import { BlankLetterPicker } from "../components/BlankLetterPicker.js";
import { Board } from "../components/Board.js";
import { Button } from "../components/Button.js";
import { ModalFrame } from "../components/ModalFrame.js";
import { PlayerCard } from "../components/PlayerCard.js";
import { Rack } from "../components/Rack.js";
import { SwapPicker } from "../components/SwapPicker.js";
import { Tagline } from "../components/Tagline.js";
import { ThinkingOverlay } from "../components/ThinkingOverlay.js";
import { Tile } from "../components/Tile.js";
import { TilesLeft } from "../components/TilesLeft.js";
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
  const [confirmPass, setConfirmPass] = useState(false);
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
      // Best-effort: show the letters the user has placed, sorted by
      // board POSITION (not insertion order) so the preview reads as
      // the word the user actually sees forming on the board. E.g.
      // dropping A→R→I→S vertically should show "ARIS", not the order
      // in which the tiles were dragged ("ISA" etc).
      const allSameRow = pending.every(
        (p) => p.position.row === pending[0]!.position.row,
      );
      const allSameCol = pending.every(
        (p) => p.position.col === pending[0]!.position.col,
      );
      const sorted = [...pending].sort((a, b) => {
        if (allSameRow) return a.position.col - b.position.col;
        if (allSameCol) return a.position.row - b.position.row;
        return (
          a.position.row - b.position.row || a.position.col - b.position.col
        );
      });
      const partial = sorted
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
        /* Tablet portrait (iPad in portrait, Tab S8) — let the game render
           with a stacked layout instead of blocking. The grid below uses
           auto-fit to collapse from board+sidebar to a vertical stack. */
        @media (orientation: portrait) and (max-width: 600px) {
          .gs-portrait-warning { display: flex !important; }
          .gs-game-body { display: none; }
        }
        /* Tablet portrait reflow — single column, board centred at top,
           sidebar below it. Rack + actions remain a sticky bottom strip. */
        @media (orientation: portrait) and (min-width: 601px) {
          .gs-main-grid {
            grid-template-columns: 1fr !important;
          }
          .gs-board-wrap {
            max-width: min(70vh, 100%);
          }
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
          flexDirection: "row",
          width: "100%",
          // Pin to the viewport so the sidebar never falls off the
          // bottom of the screen — every control must stay in view.
          height: "100dvh",
          maxHeight: "100dvh",
          background: color.cream,
          overflow: "hidden",
          // Tight 16 px top padding so the board reaches the top of the
          // viewport on landscape (was 80 px — left an empty band beside
          // BackPill). BackPill (top-left) + UserChip (top-right) still
          // sit at top: 24 with their own paper backgrounds; they float
          // over the corners of the board/sidebar without obscuring
          // any meaningful content. The sidebar adds its own top inset
          // below so its first card clears UserChip.
          padding: `${space.x4}px ${space.x6}px ${space.x4}px`,
          gap: space.x6,
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
          /* No onClick — UserChip opens its built-in "change your name
             from home" info modal so the chip never feels inert. */
          <UserChip name={currentUser} />
        )}

        {/* Board — fills the available vertical space. The board's outer
            wrapper is a perfectly-square box sized to whichever of
            (column-width, available-height) is smaller, so the board is
            always as big as the iPad will allow without overflowing. */}
        <div
          className="gs-board-wrap"
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            zIndex: 1,
            // Establishes a size container so the inner board can size itself
            // to the smaller of column width / height via `cqmin` units. Without
            // this, max-width + max-height + aspect-ratio fight each other and
            // the browser settles on a non-square (908×768 on Tab S8 etc.).
            containerType: "size",
          }}
        >
          <div
            style={{
              // 100cqmin = min(column inline-size, column block-size). This
              // is the largest square that fits in the column on any device:
              // width-constrained on small iPads, height-constrained on
              // Tab S8 / wide displays.
              width: "100cqmin",
              height: "100cqmin",
              containerType: "size",
              containerName: "board",
            }}
          >
            <Board board={board} pendingKeys={keys} onCellTap={stableOnCellTap} />
          </div>
        </div>

        {/* Sidebar — column on the right with scoreboard, rack, action
            stack, and contextual cards. Width chosen so the 7-tile rack
            wraps to 4 + 3 (instead of 3 + 3 + 1, which would push the
            Resign button past the viewport bottom on iPad). Top inset
            of space.x12 reserves room for the UserChip floating at
            top: 24 / right: 24 — without it the variant tagline would
            sit underneath the chip. */}
        <aside
          style={{
            position: "relative",
            zIndex: 1,
            flexShrink: 0,
            width: 360,
            display: "flex",
            flexDirection: "column",
            gap: space.x2,
            height: "100%",
            minHeight: 0,
            // 72 px top inset clears the absolutely-positioned UserChip
            // (top: 24, height ~40 → bottom ~64) with a small buffer so
            // the variant + tiles-left header isn't tucked behind it.
            paddingTop: 72,
            // Pinned — never scrolls. The contextual status strip
            // (last-move / pending / error) collapses three would-be
            // strips into one slot so this stays true even when a
            // submission is rejected.
            overflowY: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <Tagline>{variantLabel}</Tagline>
            <TilesLeft count={game.bag.length} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: space.x2 }}>
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

          {/* Contextual status strip — single slot covering three states:
              ERROR  (a placement was rejected) — red, shows the rejected
                     word + the failure reason
              PENDING (tiles laid, not yet submitted) — moss, shows the
                     word being composed + its projected score
              LAST   (most recent committed place-move) — paper, shows
                     the opponent's last word + score
              Priority error > pending > last so the sidebar stays a single
              card tall and the right pane never has to scroll, even when
              a submission fails while pending tiles are still on the board. */}
          {(() => {
            const labelStyle = {
              fontSize: size.micro + 1,
              letterSpacing: ".08em",
              textTransform: "uppercase" as const,
              fontWeight: weight.med,
            };
            const rowStyle = {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: space.x3,
            };
            const wordStyle = {
              fontSize: size.body,
              color: color.ink,
              fontFamily: font.serif,
              fontWeight: weight.bold,
              minWidth: 0,
              overflow: "hidden" as const,
              textOverflow: "ellipsis" as const,
              whiteSpace: "nowrap" as const,
            };
            if (error) {
              return (
                <div
                  role="alert"
                  style={{
                    padding: `${space.x2}px ${space.x4}px`,
                    background: color.dangerBg,
                    border: `1.5px solid ${color.danger}`,
                    borderRadius: radius.card,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <span style={{ ...labelStyle, color: color.danger }}>Try again</span>
                  <div style={rowStyle}>
                    <span style={wordStyle}>
                      {pendingPreview?.word.toUpperCase() ?? "—"}
                    </span>
                    <span
                      style={{
                        fontSize: size.caption,
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
                    padding: `${space.x2}px ${space.x4}px`,
                    background: color.successBg,
                    border: `1.5px solid ${color.success}`,
                    borderRadius: radius.card,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <span style={{ ...labelStyle, color: color.success }}>Pending</span>
                  <div style={rowStyle}>
                    <span style={wordStyle}>{pendingPreview.word.toUpperCase()}</span>
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
              );
            }
            if (lastMove) {
              return (
                <div
                  style={{
                    padding: `${space.x2}px ${space.x4}px`,
                    background: color.paper,
                    border: `1.5px solid ${color.stroke}`,
                    borderRadius: radius.card,
                    boxShadow: shadow.card,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <span style={{ ...labelStyle, color: color.inkSoft }}>
                    Last · {lastMove.name}
                  </span>
                  <div style={rowStyle}>
                    <span style={wordStyle}>{lastMove.word}</span>
                    <span style={{ fontSize: size.body, color: color.brown, fontWeight: weight.med }}>
                      +{lastMove.score}
                    </span>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Flex spacer — absorbs the gap between the top stack
              (header + player cards + status strip) and the bottom
              stack (rack + action stack) so the Resign button always
              hugs the bottom of the sidebar instead of leaving empty
              cream space between Resign and the bottom-left TW corner
              of the board. */}
          <div style={{ flex: 1, minHeight: 0 }} aria-hidden />

          {/* Rack — slots into the sidebar, wraps to two rows of 4 + 3
              tiles inside a 320 px column. Brown felt + inset shadow
              preserved from the design-system migration. */}
          <Rack
            rack={player.rack}
            rackOrder={rackOrder}
            usedIndices={usedRackIndices}
            onTileTap={onRackTap}
            selectedIndex={selectedRackIndex}
          />

          {/* Action stack — Submit is the prominent primary anchor;
              Recall + Shuffle + Swap + Pass fill a tidy 2-column grid;
              Resign is the destructive trailing action. Vertical layout
              keeps the board the dominant element on the screen. */}
          <div style={{ display: "flex", flexDirection: "column", gap: space.x2, marginTop: space.x2 }}>
            <Button
              kind="primary"
              size="lg"
              full
              onClick={submitMove}
              disabled={pending.length === 0}
              muted
            >
              Submit
              {pending.length > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: size.caption,
                    fontWeight: weight.med,
                    opacity: 0.85,
                  }}
                >
                  · {pending.length} tile{pending.length === 1 ? "" : "s"}
                </span>
              )}
            </Button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.x2 }}>
              <Button
                kind="secondary"
                size="sm"
                onClick={() => {
                  recallPending();
                  setSelectedRackIndex(null);
                }}
                disabled={pending.length === 0}
                icon={<span>↺</span>}
              >
                Recall
              </Button>
              <Button kind="secondary" size="sm" onClick={shuffleRack} icon={<span>⇅</span>}>
                Shuffle
              </Button>
              <Button
                kind="secondary"
                size="sm"
                onClick={() => setSwapping(true)}
                disabled={!canSwap}
                icon={<span>⇌</span>}
              >
                Swap
              </Button>
              <Button kind="secondary" size="sm" onClick={() => setConfirmPass(true)}>
                Pass
              </Button>
            </div>
            <Button kind="destructive" size="sm" full onClick={() => setConfirmResign(true)}>
              Resign
            </Button>
          </div>
        </aside>
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
          {/* Body — surface the only mild but real consequence: if both
              players pass twice in a row, the game ends. */}
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
          {/* Body — a moss-tinted callout reinforces what "End game now"
              will do without a third action button cluttering the
              footer. */}
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
            Resigning is final. The current score stands and the round
            is marked as a win for the other player.
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
