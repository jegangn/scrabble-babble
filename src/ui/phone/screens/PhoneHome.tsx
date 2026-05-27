import { useEffect, useState } from "react";
import { useGameStore } from "../../../store/gameStore.js";
import { loadInProgress } from "../../../storage/game-storage.js";
import { tokens } from "../../tokens.js";
import { FooterMark } from "../../components/FooterMark.js";
import { TileHero } from "../../components/TileHero.js";
import { PhoneShell } from "../PhoneShell.js";
import { PhoneNavButton } from "../components/PhoneNavButton.js";

/**
 * Phone portrait home screen. Single-column nav stack mirrors the desktop
 * HomeScreen's wording, actions, and Resume condition.
 *
 * Resume condition: identical to HomeScreen — `loadInProgress()` returns a
 * game whose `status.kind !== "ended"`.
 *
 * Compact preset: on viewports ≤ 700 px tall (e.g. iPhone SE 375×667 with
 * ~573 px usable after Safari chrome) we shrink the tile hero and tighten
 * paddings so all content stays above the fold without scrolling. The check
 * is a one-shot `matchMedia` at mount — `DeviceRouter` re-mounts on
 * rotation, so the static snapshot is always correct.
 */
export function PhoneHome(): JSX.Element {
  const setScreen = useGameStore((s) => s.setScreen);
  const hydrate = useGameStore((s) => s.hydrate);
  const [hasInProgress, setHasInProgress] = useState(false);

  // True when the viewport is short enough to need the compact layout
  // (iPhone SE and similar — usable height ~573 px in Safari). SSR-safe.
  const [isShort] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-height: 700px)").matches,
  );

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

  const { space, grain } = tokens;

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
          padding: isShort
            ? `${space.x5}px ${space.x4}px ${space.x4}px`
            : `${space.x8}px ${space.x5}px ${space.x6}px`,
          gap: isShort ? space.x4 : space.x6,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Wordmark heading — the same animated tile hero as the desktop
            home (shared <TileHero>), scaled down so SCRABBLE fits the
            narrow phone width. Compact preset shrinks tiles further for
            short viewports (e.g. iPhone SE). */}
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: isShort ? space.x2 : space.x3,
            paddingTop: isShort ? space.x2 : space.x4,
          }}
        >
          <TileHero tileSize={isShort ? 30 : 36} tileGap={isShort ? 3 : 4} />
        </header>

        {/* Nav buttons */}
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: isShort ? space.x2 : space.x3,
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
        <FooterMark style={{ paddingTop: isShort ? space.x2 : space.x4 }} />
      </div>
    </PhoneShell>
  );
}
