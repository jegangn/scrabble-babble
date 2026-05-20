import { useEffect, useState } from "react";
import { tokens } from "../tokens.js";

/**
 * Bot-thinking indicator — a small pill anchored to the bottom-centre
 * of the viewport. Replaced the full-screen translucent overlay so the
 * user can still see the board (the bot's about to play on it) without
 * the app feeling frozen.
 *
 * Older-user friendly: tabular elapsed time so it never feels stuck,
 * pulsing brown dot for visible motion, polite live-region for screen
 * readers. The chip itself doesn't block pointer events — the board is
 * already locked at the store level during the bot's turn, so the
 * indicator is presentational only.
 */
export function ThinkingOverlay(): JSX.Element {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 100);
    return () => window.clearInterval(interval);
  }, []);

  const { color, font, size, weight, space, radius, shadow, motion } = tokens;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: space.x6,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: space.x3,
        padding: `${space.x2}px ${space.x4}px`,
        background: color.paper,
        border: `1.5px solid ${color.stroke}`,
        borderRadius: radius.pill,
        boxShadow: shadow.toast,
        pointerEvents: "none",
        animation: `thinking-rise ${motion.slow} both`,
      }}
    >
      <PulseDot />
      <span
        style={{
          fontFamily: font.sans,
          fontWeight: weight.med,
          fontSize: size.body,
          color: color.ink,
          letterSpacing: "-0.005em",
        }}
      >
        Computer is thinking
        <Dots />
      </span>
      <span
        style={{
          fontFamily: font.sans,
          fontWeight: weight.med,
          fontSize: size.caption,
          color: color.inkSoft,
          fontVariantNumeric: "tabular-nums",
          minWidth: 36,
          textAlign: "right",
        }}
      >
        {(elapsedMs / 1000).toFixed(1)}s
      </span>

      {/* Keyframes — scoped to the chip; no global CSS pollution. */}
      <style>{`
        @keyframes thinking-rise {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes thinking-pulse {
          0%, 100% { opacity: .35; transform: scale(.9); }
          50%      { opacity: 1;   transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/** Small brown dot that breathes — the visual heartbeat of the chip. */
function PulseDot(): JSX.Element {
  const { color } = tokens;
  return (
    <span
      aria-hidden
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color.brown,
        flexShrink: 0,
        animation: "thinking-pulse 1.4s ease-in-out infinite",
      }}
    />
  );
}

/**
 * Trailing dot-dot-dot. Same idiom as before but capped at 3 dots so
 * the chip's width doesn't bounce by a px each cycle (tabular elapsed
 * time on the right is sensitive to layout shift).
 */
function Dots(): JSX.Element {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const i = window.setInterval(() => setCount((c) => (c + 1) % 4), 350);
    return () => window.clearInterval(i);
  }, []);
  // Reserve fixed width via inline-block so the trailing dots don't
  // push the elapsed-time readout around.
  return (
    <span
      aria-hidden
      style={{ display: "inline-block", width: "1.5ch", textAlign: "left" }}
    >
      {".".repeat(count)}
    </span>
  );
}
