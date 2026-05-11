import { APP_NAME } from "../../config/branding.js";
import { ACCENT } from "../theme.js";

export function LoadingScreen(): JSX.Element {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <h1 style={{ fontSize: "2.5em", fontWeight: 700, color: ACCENT.primary }}>{APP_NAME}</h1>
      <p style={{ fontSize: "1.1em", color: ACCENT.text, opacity: 0.7 }}>
        Loading dictionary…
      </p>
    </div>
  );
}
