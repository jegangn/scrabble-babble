import { useId, useRef } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import { tokens } from "../tokens.js";

export interface NameInputProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /**
   * Suffix "· You" tag on the label to mark Player 1 as the device owner.
   */
  readonly you?: boolean;
  /** Disable typing (e.g. when opponent = Computer for Player 2). */
  readonly disabled?: boolean;
  /** Autofocus on mount. */
  readonly autoFocus?: boolean;
  /** Optional placeholder text when the value is empty. */
  readonly placeholder?: string;
  readonly style?: CSSProperties;
}

/**
 * Card-styled name input — avatar circle (first letter of name) +
 * uppercase caption + inline text input. The whole row is the input;
 * tapping anywhere focuses the text field.
 *
 * iPad Safari quirk: implicit label↔input association (input wrapped
 * by label) sometimes fails to bring up the on-screen keyboard when
 * the tap lands on the label/avatar (not on the input itself). We use
 * an EXPLICIT htmlFor/id association via useId() AND a useRef-driven
 * pointerDown handler that calls .focus() inside the user gesture —
 * both belt-and-braces fixes for the same quirk.
 */
export function NameInput({
  label,
  value,
  onChange,
  you,
  disabled,
  autoFocus,
  placeholder,
  style,
}: NameInputProps): JSX.Element {
  const { color, radius, shadow, space, font, size, weight } = tokens;
  const initial = value.trim().charAt(0).toUpperCase() || "?";
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    // 16-char cap matches the validation rule in the spec.
    onChange(e.target.value.slice(0, 16));
  };

  return (
    <label
      htmlFor={inputId}
      onPointerDown={(e) => {
        if (disabled) return;
        // If the tap didn't land on the input itself, focus it
        // synchronously inside the user gesture so iOS Safari shows
        // the keyboard. Don't preventDefault — let the native input
        // tap path do its work when the tap is already on the input.
        if (e.target !== inputRef.current) {
          inputRef.current?.focus();
        }
      }}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        alignItems: "center",
        gap: space.x4,
        background: color.paper,
        border: `1.5px solid ${color.stroke}`,
        borderRadius: radius.card,
        padding: "10px 16px 10px 10px",
        boxShadow: shadow.card,
        minHeight: 64,
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "text",
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: color.brownTint,
          color: color.brown,
          display: "grid",
          placeItems: "center",
          fontFamily: font.serif,
          fontWeight: weight.bold,
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {initial}
      </span>
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span
          style={{
            fontSize: size.micro + 1,
            color: color.inkSoft,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            fontWeight: weight.med,
          }}
        >
          {label}
          {you && " · You"}
        </span>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          inputMode="text"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          maxLength={16}
          style={{
            appearance: "none",
            background: "transparent",
            border: "none",
            outline: "none",
            font: "inherit",
            fontSize: size.body,
            fontWeight: weight.med,
            color: color.ink,
            // Vertical padding gives the input a larger tap target so
            // a direct tap reliably lands on the input element itself
            // (rather than the label text above it) — important on
            // iPad Safari where implicit-label focus + keyboard is
            // unreliable.
            padding: "6px 0",
            margin: 0,
            width: "100%",
            cursor: disabled ? "not-allowed" : "text",
          }}
        />
      </span>
    </label>
  );
}
