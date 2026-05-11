import { ACCENT, TILE } from "../theme.js";

export interface HotSeatHandoffProps {
  readonly nextPlayerName: string;
  readonly onReady: () => void;
}

export function HotSeatHandoff({ nextPlayerName, onReady }: HotSeatHandoffProps): JSX.Element {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: ACCENT.primary, color: TILE.bg, zIndex: 200, gap: 24 }}
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
