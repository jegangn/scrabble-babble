import type { CSSProperties } from "react";
import { playUiTap } from "../../audio/sounds.js";
import { tokens } from "../tokens.js";

export interface DictAlertProps {
  /**
   * Optional retry handler. When provided, the alert shows a "Retry"
   * button — useful if the dictionary load is recoverable (network
   * came back). When omitted, the alert is informational only.
   */
  readonly onRetry?: () => void;
  readonly style?: CSSProperties;
}

/**
 * Slim banner shown above the home menu when the wordlist failed to
 * load. Warn-tinted (amber on cream-warm). The retry button is
 * optional — Phase 1's load is single-shot, so today we render it
 * informational, but the design allows the action when we wire it.
 */
export function DictAlert({ onRetry, style }: DictAlertProps): JSX.Element {
  const { color, radius, space, size, weight } = tokens;
  return (
    <div
      role="alert"
      style={{
        display: "grid",
        gridTemplateColumns: onRetry ? "auto 1fr auto" : "auto 1fr",
        alignItems: "center",
        gap: space.x4,
        padding: `${space.x3}px ${space.x4}px`,
        background: color.warnBg,
        border: `1.5px solid ${color.warn}`,
        borderRadius: radius.card,
        color: color.brownDark,
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.chip,
          background: color.warn,
          color: color.paper,
          display: "grid",
          placeItems: "center",
          fontWeight: weight.bold,
        }}
      >
        !
      </span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
        <strong style={{ fontWeight: weight.bold }}>Dictionary not loaded</strong>
        <span style={{ fontSize: size.caption, color: color.inkSoft }}>
          Go online and refresh once to download the wordlist — then it works offline.
        </span>
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={() => {
            playUiTap();
            onRetry();
          }}
          style={{
            appearance: "none",
            font: "inherit",
            background: "transparent",
            border: `1.5px solid ${color.warn}`,
            color: color.brownDark,
            borderRadius: radius.pill,
            padding: "8px 14px",
            fontSize: size.caption,
            fontWeight: weight.med,
            cursor: "pointer",
            minHeight: 36,
            touchAction: "manipulation",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
