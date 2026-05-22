import { useEffect, useMemo, useState } from "react";
import { enumerateTumblerWords, scoreTumblerWord } from "../../engine/games/tumbler.js";
import type { TrieNode } from "../../engine/dictionary.js";
import type { Letter } from "../../engine/types.js";
import { tokens } from "../tokens.js";
import { SectionLabel } from "./SectionLabel.js";

export interface PossibleWordsCardProps {
  readonly rack: ReadonlyArray<Letter>;
  readonly dictionary: TrieNode | null;
  readonly foundWords: ReadonlyArray<string>;
}

// Reveal tuning (adjusted live in the visual pass).
const REVEAL_DELAY_MS = 500; // shimmer duration before words cascade in
const STAGGER_MS = 28; // gap between consecutive word reveals
const REVEAL_CAP = 40; // index beyond which words stop staggering (appear together)
const SKELETON_COUNT = 10;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * End-of-round "All possible words" card for Tumbler. Lists every valid word
 * the rack could make (best-first), the player's finds tinted + ticked. Shows
 * a brief shimmer, then cascades the words in. Renders nothing if there's no
 * dictionary or no possible words.
 */
export function PossibleWordsCard({
  rack,
  dictionary,
  foundWords,
}: PossibleWordsCardProps): JSX.Element | null {
  const { color, radius, shadow, space, size, weight, font } = tokens;

  const words = useMemo(() => {
    if (!dictionary) return [];
    return [...enumerateTumblerWords(rack, dictionary)].sort(
      (a, b) => scoreTumblerWord(b) - scoreTumblerWord(a),
    );
  }, [dictionary, rack]);

  const foundSet = useMemo(
    () => new Set(foundWords.map((w) => w.toUpperCase())),
    [foundWords],
  );

  const [reduced] = useState(prefersReducedMotion);
  const [revealed, setRevealed] = useState(reduced);
  useEffect(() => {
    if (reduced) return;
    const t = window.setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [reduced]);

  if (!dictionary || words.length === 0) return null;

  const foundCount = words.reduce((n, w) => (foundSet.has(w) ? n + 1 : n), 0);

  return (
    <div
      style={{
        background: color.paper,
        border: `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        boxShadow: shadow.card,
        padding: space.x4,
        display: "flex",
        flexDirection: "column",
        gap: space.x3,
      }}
    >
      <style>{`
        @keyframes pwFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pwPulse { 0%, 100% { opacity: .35; } 50% { opacity: .7; } }
        .pw-pill { animation: pwFadeIn 280ms ease-out both; }
        .pw-skel { animation: pwPulse 1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .pw-pill { animation: none !important; opacity: 1 !important; transform: none !important; }
          .pw-skel { animation: none !important; }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: space.x3 }}>
        <SectionLabel style={{ margin: 0 }}>All possible words</SectionLabel>
        <span style={{ fontSize: size.caption, color: color.inkSoft, fontVariantNumeric: "tabular-nums" }}>
          {revealed ? `${words.length} · you found ${foundCount}` : "Finding every word…"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))",
          gap: 8,
          overflowY: "auto",
          maxHeight: 360,
          minHeight: 0,
          paddingRight: 4,
        }}
      >
        {!revealed
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <span
                key={i}
                className="pw-skel"
                aria-hidden
                style={{
                  height: 30,
                  background: color.cream,
                  border: `1px solid ${color.strokeSoft}`,
                  borderRadius: radius.chip,
                }}
              />
            ))
          : words.map((w, i) => {
              const isFound = foundSet.has(w);
              return (
                <span
                  key={w}
                  className="pw-pill"
                  style={{
                    animationDelay: `${Math.min(i, REVEAL_CAP) * STAGGER_MS}ms`,
                    background: isFound ? color.successBg : color.cream,
                    border: `1px solid ${isFound ? color.success : color.strokeSoft}`,
                    borderRadius: radius.chip,
                    padding: "6px 10px",
                    fontSize: size.caption,
                    fontWeight: weight.med,
                    color: isFound ? color.success : color.ink,
                    textAlign: "center",
                    fontFamily: font.serif,
                    letterSpacing: ".02em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={w}
                >
                  {isFound ? `✓ ${w}` : w}
                </span>
              );
            })}
      </div>
    </div>
  );
}
