import type { ReactNode } from "react";
import { tokens } from "../../tokens.js";
import { Button } from "../../components/Button.js";
import type { ButtonKind } from "../../components/Button.js";

export interface PhoneNavButtonProps {
  /** Optional leading icon / glyph. Rendered to the left of the label. */
  readonly icon?: ReactNode | undefined;
  readonly label: string;
  readonly kind?: ButtonKind | undefined;
  readonly disabled?: boolean | undefined;
  readonly onClick: () => void;
}

/**
 * Full-width navigation button for phone menu screens.
 * At least 56 px tall (Button md baseline is 56 px). Uses the existing
 * Button component for consistent brand styling and tap-tick sound.
 */
export function PhoneNavButton({
  icon,
  label,
  kind = "secondary",
  disabled,
  onClick,
}: PhoneNavButtonProps): JSX.Element {
  return (
    <Button
      kind={kind}
      size="md"
      full
      icon={icon}
      {...(disabled !== undefined ? { disabled } : {})}
      onClick={onClick}
      style={{
        justifyContent: "flex-start",
        paddingLeft: tokens.space.x5,
        paddingRight: tokens.space.x5,
        fontWeight: tokens.weight.med,
        fontSize: tokens.size.body,
        minHeight: 56,
      }}
    >
      {label}
    </Button>
  );
}
