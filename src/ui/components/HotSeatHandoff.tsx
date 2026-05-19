import { ACCENT, TILE } from "../theme.js";

export interface HotSeatHandoffProps {
  readonly nextPlayerName: string;
  readonly onReady: () => void;
}

export function HotSeatHandoff({ nextPlayerName, onReady }: HotSeatHandoffProps): JSX.Element {
  // fixed inset-0 escapes the root's safe-area padding. On a notched iPad in
  // landscape the "Ready" button could otherwise slip under the home indicator
  // / camera notch. Re-apply env(safe-area-inset-*) directly here.
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: ACCENT.primary,
        color: TILE.bg,
        zIndex: 200,
        gap: 24,
        paddingTop: "env(safe-area-inset-top)",
        paddingRight: "env(safe-area-inset-right)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
      }}
    >
      <div style={{ fontSize: "1.4em", opacity: 0.85 }}>Pass the iPad to</div>
      <div style={{ fontSize: "3em", fontWeight: 700 }}>{nextPlayerName}</div>
      <button
        type="button"
        onClick={onReady}
        style={{
          background: TILE.bg,
          color: ACCENT.primary,
          padding: "16px 32px",
          fontSize: "1.2em",
          fontWeight: 700,
          borderRadius: 12,
          touchAction: "manipulation",
          marginTop: 24,
        }}
      >
        Ready
      </button>
    </div>
  );
}
