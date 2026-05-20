import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal.js";
import { ACCENT } from "../theme.js";

export interface UserNamePromptProps {
  /** Pre-fill for the "Change user" case. Empty string for first-launch. */
  readonly initialName?: string;
  /** Title shown above the input. Defaults to a first-launch greeting. */
  readonly title?: string;
  /** Submit handler; receives the trimmed name. */
  readonly onSubmit: (name: string) => void;
  /**
   * Optional Cancel handler. Omit (or pass undefined) when the prompt is
   * mandatory — e.g. on first launch we don't let the user dismiss it
   * without entering something.
   */
  readonly onCancel?: () => void;
}

/**
 * Friendly name-prompt dialog. Used both for first-launch (mandatory) and
 * for the "Change user" flow on Home (cancellable). Autofocuses the input
 * and submits on Enter, since the iPad on-screen keyboard makes tapping
 * a small Submit button less convenient.
 */
export function UserNamePrompt({
  initialName = "",
  title,
  onSubmit,
  onCancel,
}: UserNamePromptProps): JSX.Element {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input on mount so the on-screen keyboard appears immediately
  // and the user can start typing without an extra tap. Delay slightly so
  // the modal's mount animation completes before iOS Safari scrolls into
  // view (avoids a layout jump).
  useEffect(() => {
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 80);
    return () => window.clearTimeout(t);
  }, []);

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return; // require at least one char
    onSubmit(trimmed);
  };

  return (
    <Modal
      title={title ?? "Welcome — what's your name?"}
      // exactOptionalPropertyTypes: spread the prop only when defined; passing
      // `undefined` to a required-but-optional prop is rejected by TS.
      {...(onCancel ? { onClose: onCancel } : {})}
    >
      <p style={{ marginBottom: 12, opacity: 0.75 }}>
        We'll use this on leaderboards in Tumbler and Spelling Bee. You can
        change it any time from the top-right of the home screen.
      </p>
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 24))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Your name"
        maxLength={24}
        autoCapitalize="words"
        autoCorrect="off"
        spellCheck={false}
        style={{
          width: "100%",
          padding: "12px 14px",
          fontSize: "1.1em",
          borderRadius: 8,
          border: `2px solid ${ACCENT.primary}`,
          background: "white",
          color: ACCENT.text,
          minHeight: 48,
          boxSizing: "border-box",
        }}
      />
      <div className="flex gap-3 mt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={btnStyle("secondary")}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={name.trim().length === 0}
          style={{ ...btnStyle("primary"), opacity: name.trim().length === 0 ? 0.4 : 1 }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function btnStyle(variant: "primary" | "secondary"): React.CSSProperties {
  return {
    flex: 1,
    background: variant === "primary" ? ACCENT.primary : "white",
    color: variant === "primary" ? "white" : ACCENT.text,
    border: variant === "primary" ? "none" : `2px solid ${ACCENT.primary}`,
    padding: "12px 16px",
    fontSize: "1em",
    fontWeight: 600,
    borderRadius: 8,
    minHeight: 48,
    touchAction: "manipulation",
  };
}
