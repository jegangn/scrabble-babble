import { useEffect, useRef, useState } from "react";
import { playUiTap } from "../../audio/sounds.js";
import { tokens } from "../tokens.js";
import { Button } from "./Button.js";
import { ModalFrame } from "./ModalFrame.js";

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
 * Name-prompt dialog — first-launch greeting + "Change user" flow.
 *
 * Single text input with a live-updating avatar circle (first letter of
 * the name being typed) so the visual cue stays in sync with what the
 * user is actually entering. Autofocuses + selects on mount so the
 * iPad on-screen keyboard appears immediately.
 *
 * Submit on Enter; Save button is disabled while the input is empty.
 * First-launch flow omits onCancel — the user must enter something.
 */
export function UserNamePrompt({
  initialName = "",
  title,
  onSubmit,
  onCancel,
}: UserNamePromptProps): JSX.Element {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus + select shortly after mount so the modal's mount animation
  // completes before iOS Safari scrolls the input into view.
  useEffect(() => {
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 80);
    return () => window.clearTimeout(t);
  }, []);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0;

  const submit = (): void => {
    if (!canSubmit) return;
    playUiTap();
    onSubmit(trimmed);
  };

  const cancel = (): void => {
    playUiTap();
    onCancel?.();
  };

  const { color, radius, space, font, size, weight } = tokens;
  const initial = trimmed.charAt(0).toUpperCase() || "?";

  return (
    <ModalFrame
      title={title ?? "Welcome — what's your name?"}
      sub="Used on leaderboards in Tumbler + Spelling Bee. You can change it any time from the home screen."
      {...(onCancel ? { onClose: onCancel } : {})}
      footer={
        <>
          {onCancel && (
            <Button kind="ghost" onClick={cancel}>
              Cancel
            </Button>
          )}
          <Button kind="primary" onClick={submit} disabled={!canSubmit}>
            Save
          </Button>
        </>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          alignItems: "center",
          gap: space.x4,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: color.brownTint,
            color: color.brown,
            display: "grid",
            placeItems: "center",
            fontFamily: font.serif,
            fontWeight: weight.bold,
            fontSize: 24,
            flexShrink: 0,
          }}
        >
          {initial}
        </span>
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
            fontSize: size.bodyLg,
            fontWeight: weight.med,
            borderRadius: radius.card,
            border: `2px solid ${color.stroke}`,
            background: color.paper,
            color: color.ink,
            minHeight: 52,
            boxSizing: "border-box",
            outline: "none",
            // Moss focus halo — gives the input the "active card" feel
            // without a separate focus state in JS.
            transition: "border-color 200ms ease, box-shadow 200ms ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = color.brown;
            e.currentTarget.style.boxShadow = `0 0 0 4px color-mix(in oklab, ${color.success} 25%, transparent)`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = color.stroke;
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>
    </ModalFrame>
  );
}
