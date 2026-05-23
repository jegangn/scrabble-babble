import type { ReactNode } from "react";
import { tokens } from "../tokens.js";

export function PhoneShell({
  top,
  children,
}: {
  readonly top?: ReactNode;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div
      data-testid="phone-root"
      style={{
        height: "var(--app-h)",
        maxHeight: "var(--app-h)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: tokens.color.cream,
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {top}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}
