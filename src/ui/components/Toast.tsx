import type { CSSProperties } from "react";
import { tokens } from "../tokens.js";

export type ToastKind = "success" | "error" | "warn" | "info";

export interface ToastProps {
  readonly kind?: ToastKind;
  readonly title: string;
  /** Optional secondary line; smaller and slightly muted. */
  readonly sub?: string;
  /** ARIA role — `status` for non-urgent updates, `alert` for errors. */
  readonly role?: "status" | "alert";
  readonly style?: CSSProperties;
}

interface Palette {
  readonly bg: string;
  readonly fg: string;
  readonly border: string;
}

function palette(kind: ToastKind): Palette {
  const { color } = tokens;
  switch (kind) {
    case "success":
      return { bg: color.successBg, fg: color.success, border: color.success };
    case "error":
      return { bg: color.dangerBg, fg: color.danger, border: color.danger };
    case "warn":
      return { bg: color.warnBg, fg: color.brown, border: color.warn };
    case "info":
    default:
      return { bg: color.ink, fg: color.cream, border: color.ink };
  }
}

function glyph(kind: ToastKind): string {
  switch (kind) {
    case "success":
      return "✓";
    case "error":
    case "warn":
      return "!";
    case "info":
    default:
      return "i";
  }
}

/**
 * Pill-shaped flash notification used for word-submission feedback,
 * validation errors, and (rarely) status updates. Sits centred at the
 * top of the screen; auto-clears via the calling effect (this component
 * is purely visual — visibility is the caller's responsibility).
 */
export function Toast({
  kind = "info",
  title,
  sub,
  role,
  style,
}: ToastProps): JSX.Element {
  const p = palette(kind);
  const { space, radius, size, weight, shadow } = tokens;
  return (
    <div
      role={role ?? (kind === "error" ? "alert" : "status")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: space.x3,
        background: p.bg,
        color: p.fg,
        border: `1.5px solid ${p.border}`,
        borderRadius: radius.pill,
        padding: "12px 22px",
        fontSize: size.body,
        fontWeight: weight.med,
        boxShadow: shadow.toast,
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: p.fg,
          color: p.bg,
          display: "grid",
          placeItems: "center",
          fontSize: 13,
          fontWeight: weight.bold,
          flexShrink: 0,
        }}
      >
        {glyph(kind)}
      </span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
        <span>{title}</span>
        {sub && (
          <span style={{ fontSize: size.micro + 1, opacity: 0.8, fontWeight: weight.reg }}>
            {sub}
          </span>
        )}
      </span>
    </div>
  );
}
