import { useEffect, useState } from "react";
import { useGameStore } from "../../store/gameStore.js";
import { getGameResult } from "../../engine/game.js";
import { loadHistory } from "../../storage/game-storage.js";
import type { HistoryEntry } from "../../storage/db.js";
import { playUiTap } from "../../audio/sounds.js";
import { tokens } from "../tokens.js";
import { BackPill } from "../components/BackPill.js";
import { FooterMark } from "../components/FooterMark.js";
import { UserChip } from "../components/UserChip.js";

/**
 * Scrabble scoreboard — every completed Scrabble match the device has
 * recorded. Compact rows (`date · winner beat loser · 312–268`) expand
 * on tap to reveal variant, opponent, move count, and the finished
 * timestamp. Tumbler and Spelling Bee keep their own in-screen
 * leaderboards; this page deliberately stays Scrabble-only so the list
 * doesn't get crowded by daily Bee entries.
 */
export function ScoresScreen(): JSX.Element {
  const setScreen = useGameStore((s) => s.setScreen);
  const currentUser = useGameStore((s) => s.currentUser);

  const [entries, setEntries] = useState<ReadonlyArray<HistoryEntry> | null>(null);

  useEffect(() => {
    void (async () => {
      const list = await loadHistory().catch(() => [] as ReadonlyArray<HistoryEntry>);
      setEntries(list);
    })();
  }, []);

  const { color, space } = tokens;
  const loading = entries === null;

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100%",
        background: color.cream,
        overflowX: "hidden",
        overflowY: "auto",
      }}
    >
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
        }}
      />

      <BackPill onClick={() => setScreen({ kind: "home" })} />
      {currentUser && <UserChip name={currentUser} />}

      <main
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "84px 28px 64px",
          display: "flex",
          flexDirection: "column",
          gap: space.x8,
          position: "relative",
          zIndex: 1,
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: tokens.font.serif,
              fontWeight: tokens.weight.heavy,
              fontSize: tokens.size.h2,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: color.brown,
            }}
          >
            Scores
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: tokens.size.caption,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: color.inkSoft,
              fontWeight: tokens.weight.reg,
            }}
          >
            Past Scrabble matches
          </p>
        </header>

        {loading ? (
          <p style={{ color: color.inkSoft, fontSize: tokens.size.body }}>Loading…</p>
        ) : entries!.length === 0 ? (
          <EmptyHint text="No finished matches yet — your next finish lands here." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: space.x2 }}>
            {entries!.map((e) => (
              <ScrabbleRow key={e.id} entry={e} />
            ))}
          </div>
        )}

        <footer style={{ marginTop: tokens.space.x4 }}>
          <FooterMark />
        </footer>
      </main>
    </div>
  );
}

interface ScrabbleRowProps {
  readonly entry: HistoryEntry;
}

const VARIANT_LABEL: Record<string, string> = {
  classic: "Classic 15×15",
  random: "Random 15×15",
  mini: "Mini 11×11",
};

function ScrabbleRow({ entry }: ScrabbleRowProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const { color, space, radius, shadow, size, weight } = tokens;
  const game = entry.game;
  const [p0, p1] = game.players;
  // Engine-decided so a resignation reads correctly in history (a resign at
  // level scores is a loss for the resigner, not a tie).
  const result = getGameResult(game);
  const winner = result.kind === "winner" ? game.players[result.playerIndex]! : null;
  const loser = winner ? (winner === p0! ? p1! : p0!) : null;
  const variantLabel = VARIANT_LABEL[game.variant ?? "classic"] ?? "Classic 15×15";
  const isAi = p1!.name === "Computer";
  const opponent = isAi ? "vs Computer" : "Hot-seat";
  const moves = game.history.length;
  const dateShort = formatShortDate(entry.endedAt);

  const headline = winner
    ? `${winner.name} beat ${loser!.name}`
    : `Tied · ${p0!.name} & ${p1!.name}`;
  const scoreLine = winner
    ? `${winner.score}–${loser!.score}`
    : `${p0!.score}–${p1!.score}`;

  return (
    <button
      type="button"
      onClick={() => {
        playUiTap();
        setOpen((v) => !v);
      }}
      aria-expanded={open}
      style={{
        appearance: "none",
        font: "inherit",
        textAlign: "left",
        background: color.paper,
        border: `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        boxShadow: shadow.card,
        padding: `${space.x3}px ${space.x4}px`,
        display: "flex",
        flexDirection: "column",
        gap: open ? space.x2 : 0,
        cursor: "pointer",
        touchAction: "manipulation",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto",
          alignItems: "baseline",
          gap: space.x3,
        }}
      >
        <span
          style={{
            color: color.inkSoft,
            fontSize: tokens.size.caption,
            fontVariantNumeric: "tabular-nums",
            minWidth: 64,
          }}
        >
          {dateShort}
        </span>
        <span
          style={{
            fontSize: size.body,
            color: color.ink,
            fontWeight: weight.med,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {headline}
        </span>
        <span
          style={{
            fontSize: size.body,
            color: color.brown,
            fontWeight: weight.bold,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {scoreLine}
        </span>
        <span
          aria-hidden
          style={{
            color: `color-mix(in oklab, ${color.brown} 55%, transparent)`,
            transition: "transform .15s ease",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 3l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {open && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: `${space.x2}px ${space.x4}px`,
            paddingTop: space.x2,
            borderTop: `1px dashed ${color.creamDark}`,
            color: color.inkSoft,
            fontSize: tokens.size.caption,
          }}
        >
          <DetailCell label="Board" value={variantLabel} />
          <DetailCell label="Opponent" value={opponent} />
          <DetailCell label="Moves" value={String(moves)} />
          <DetailCell label="Finished" value={formatLongDate(entry.endedAt)} />
        </div>
      )}
    </button>
  );
}

interface DetailCellProps {
  readonly label: string;
  readonly value: string;
}

function DetailCell({ label, value }: DetailCellProps): JSX.Element {
  const { color, weight } = tokens;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span
        style={{
          textTransform: "uppercase",
          letterSpacing: ".08em",
          fontSize: tokens.size.micro,
          color: color.inkMuted,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: color.ink,
          fontWeight: weight.med,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

interface EmptyHintProps {
  readonly text: string;
}

function EmptyHint({ text }: EmptyHintProps): JSX.Element {
  const { color, space, radius } = tokens;
  return (
    <p
      style={{
        margin: 0,
        padding: `${space.x3}px ${space.x4}px`,
        border: `1.5px dashed ${color.stroke}`,
        borderRadius: radius.card,
        color: color.inkSoft,
        fontSize: tokens.size.body,
      }}
    >
      {text}
    </p>
  );
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatShortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
}

function formatLongDate(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} · ${hh}:${mi}`;
}
