import { tokens } from "../tokens.js";
import { Button } from "./Button.js";
import { Tagline } from "./Tagline.js";
import { Tile } from "./Tile.js";

export interface HotSeatHandoffProps {
  readonly nextPlayerName: string;
  readonly onReady: () => void;
  /**
   * Optional cancel — returns control to the previous player without
   * advancing. Per the handoff, this is the safety net for accidental
   * passes; current behaviour doesn't wire it through, so we pass an
   * empty function when omitted.
   */
  readonly onCancel?: () => void;
}

/**
 * Hot-seat handoff — full takeover that obscures the game board so the
 * previous player can't see the next player's rack while the device
 * changes hands.
 *
 * The handoff spec asks for a cream-to-cream-dark vertical gradient
 * (no game board visible behind) — a calmer transition than the old
 * solid-brown wash. The centred card holds a tile-row of the player's
 * first name + a serif h1 prompt + the two action buttons.
 *
 * First-name truncation to 8 chars matches the spec; longer names get
 * an ellipsis on the rendered tile-row only, not in the heading.
 */
export function HotSeatHandoff({
  nextPlayerName,
  onReady,
  onCancel,
}: HotSeatHandoffProps): JSX.Element {
  const { color, radius, shadow, space, font, size, weight } = tokens;
  // Show at most 8 letters as Scrabble tiles. Strip non-alphabetic
  // characters so a name like "Mary-Anne" doesn't render a hyphen tile.
  const tileLetters = nextPlayerName
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 8)
    .split("");

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={`Pass the iPad to ${nextPlayerName}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "grid",
        placeItems: "center",
        // Vertical gradient — calmer than the old solid brown.
        background: `linear-gradient(180deg, ${color.cream} 0%, ${color.creamDark} 100%)`,
        // Safe-area insets so the centred card doesn't get clipped by
        // notches / home indicators on landscape iPad.
        paddingTop: "env(safe-area-inset-top)",
        paddingRight: "env(safe-area-inset-right)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
      }}
    >
      {/* Paper-grain texture matches the rest of the app. Pointer-events
          none so the dots never intercept taps on the card below. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: tokens.grain.opacity,
          backgroundImage: tokens.grain.image,
          backgroundSize: tokens.grain.size,
          backgroundPosition: tokens.grain.position,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(100%, 620px)",
          background: color.paper,
          borderRadius: radius.panel,
          border: `1px solid ${color.strokeSoft}`,
          boxShadow: shadow.modal,
          padding: `${space.x12}px ${space.x10}px ${space.x10}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: space.x6,
          textAlign: "center",
          margin: space.x4,
        }}
      >
        {/* Tile row spelling the player's name. Wrap on narrow widths so
            8-letter names still fit on a phone-portrait screen. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {tileLetters.map((ch, i) => (
            <Tile key={i} letter={ch} size={56} variant="cream" />
          ))}
        </div>

        <Tagline>Next turn</Tagline>

        <h2
          style={{
            margin: 0,
            fontFamily: font.serif,
            fontWeight: weight.heavy,
            fontSize: size.h1,
            letterSpacing: "-0.02em",
            color: color.brown,
            maxWidth: 480,
            lineHeight: 1.05,
          }}
        >
          Pass the iPad to {nextPlayerName}
        </h2>

        <p
          style={{
            margin: 0,
            fontSize: size.bodyLg,
            color: color.inkSoft,
            maxWidth: 460,
          }}
        >
          Hand the device over before tapping ready. {nextPlayerName}'s tiles will
          appear after you do.
        </p>

        <div
          style={{
            display: "flex",
            gap: space.x3,
            marginTop: space.x4,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {onCancel && (
            <Button kind="ghost" size="lg" onClick={onCancel}>
              Cancel turn
            </Button>
          )}
          <Button kind="primary" size="lg" onClick={onReady}>
            I'm {nextPlayerName} — ready
          </Button>
        </div>
      </div>
    </div>
  );
}
