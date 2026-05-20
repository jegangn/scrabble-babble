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
 * tapping anywhere on the avatar / label focuses the text field below.
 *
 * The avatar updates live as the user types so the visual cue stays in
 * sync with the actual name. Falls back to "?" when the name is empty.
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

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    // 16-char cap matches the validation rule in the spec.
    onChange(e.target.value.slice(0, 16));
  };

  return (
    <label
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
          type="text"
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
            marginTop: 2,
            padding: 0,
            width: "100%",
            cursor: disabled ? "not-allowed" : "text",
          }}
        />
      </span>
    </label>
  );
}
