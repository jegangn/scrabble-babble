import { useEffect, useState } from "react";
import { APP_NAME } from "../../../config/branding.js";
import { useGameStore } from "../../../store/gameStore.js";
import { loadInProgress } from "../../../storage/game-storage.js";
import { tokens } from "../../tokens.js";
import { FooterMark } from "../../components/FooterMark.js";
import { PhoneShell } from "../PhoneShell.js";
import { PhoneNavButton } from "../components/PhoneNavButton.js";

/**
 * Phone portrait home screen. Single-column nav stack mirrors the desktop
 * HomeScreen's wording, actions, and Resume condition.
 *
 * Resume condition: identical to HomeScreen — `loadInProgress()` returns a
 * game whose `status.kind !== "ended"`.
 */
export function PhoneHome(): JSX.Element {
  const setScreen = useGameStore((s) => s.setScreen);
  const hydrate = useGameStore((s) => s.hydrate);
  const [hasInProgress, setHasInProgress] = useState(false);

  useEffect(() => {
    void (async () => {
      const game = await loadInProgress();
      setHasInProgress(!!game && game.status.kind !== "ended");
    })();
  }, []);

  const onResume = async (): Promise<void> => {
    const game = await loadInProgress();
    if (game) hydrate(game);
  };

  const { color, size, weight, font, space, grain } = tokens;

  return (
    <PhoneShell>
      {/* Paper-grain background — same as desktop HomeScreen */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: grain.opacity,
          backgroundImage: grain.image,
          backgroundSize: grain.size,
          backgroundPosition: grain.position,
          zIndex: 0,
        }}
      />

      {/* Scrollable content column */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: `${space.x8}px ${space.x5}px ${space.x6}px`,
          gap: space.x6,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Wordmark heading — accessible name matches desktop heading */}
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: space.x3,
            paddingTop: space.x4,
          }}
        >
          <h1
            aria-label={APP_NAME}
            style={{
              margin: 0,
              fontSize: size.h2,
              fontWeight: weight.heavy,
              fontFamily: font.serif,
              color: color.brown,
              letterSpacing: "-0.02em",
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            {APP_NAME}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: size.caption,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: color.inkSoft,
              fontWeight: weight.reg,
              fontFamily: font.sans,
            }}
          >
            Words, on your terms.
          </p>
        </header>

        {/* Nav buttons */}
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: space.x3,
            flex: 1,
            minHeight: 0,
          }}
          aria-label="Main menu"
        >
          {hasInProgress && (
            <PhoneNavButton
              icon="▶"
              label="Resume game"
              kind="primary"
              onClick={() => {
                void onResume();
              }}
            />
          )}
          <PhoneNavButton
            icon="✦"
            label="New game"
            onClick={() => setScreen({ kind: "new_game" })}
          />
          <PhoneNavButton
            icon="⧗"
            label="Tumbler"
            onClick={() => setScreen({ kind: "tumbler" })}
          />
          <PhoneNavButton
            icon="✷"
            label="Spelling Bee"
            onClick={() => setScreen({ kind: "spelling_bee" })}
          />
          <PhoneNavButton
            icon="♛"
            label="Scores"
            onClick={() => setScreen({ kind: "scores" })}
          />
        </nav>

        {/* Footer mark — same as desktop home */}
        <FooterMark style={{ paddingTop: space.x4 }} />
      </div>
    </PhoneShell>
  );
}
