import { useEffect, useState } from "react";
import { ACCENT } from "../theme.js";

/**
 * Full-screen translucent overlay shown while the bot is computing a move.
 *
 * Older-user friendly: large text, slow-pulsing dots, a visible elapsed-ms
 * counter so it never feels like the app is frozen.
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

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(245, 237, 226, 0.85)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        zIndex: 50,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          fontSize: "2em",
          fontWeight: 700,
          color: ACCENT.primary,
        }}
      >
        Computer is thinking
        <Dots />
      </div>
      <div
        style={{
          fontSize: "1em",
          color: ACCENT.text,
          opacity: 0.7,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {(elapsedMs / 1000).toFixed(1)}s
      </div>
    </div>
  );
}

function Dots(): JSX.Element {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const i = window.setInterval(() => setCount((c) => (c + 1) % 4), 350);
    return () => window.clearInterval(i);
  }, []);
  return <span aria-hidden>{".".repeat(count)}</span>;
}
