import { useEffect } from "react";
import { useGameStore } from "./store/gameStore.js";
import { loadDictionary } from "./data/load-dictionary.js";
import { loadInProgress } from "./storage/game-storage.js";
import { getOpponent, getPlayerNames, getVariant } from "./storage/settings-storage.js";
import { LoadingScreen } from "./ui/screens/LoadingScreen.js";
import { HomeScreen } from "./ui/screens/HomeScreen.js";
import { NewGameScreen } from "./ui/screens/NewGameScreen.js";
import { GameScreen } from "./ui/screens/GameScreen.js";
import { GameEndScreen } from "./ui/screens/GameEndScreen.js";
import { TumblerScreen } from "./ui/screens/TumblerScreen.js";
import { TumblerEndScreen } from "./ui/screens/TumblerEndScreen.js";
import { SpellingBeeScreen } from "./ui/screens/SpellingBeeScreen.js";
import { HotSeatHandoff } from "./ui/components/HotSeatHandoff.js";

export function App(): JSX.Element {
  const screen = useGameStore((s) => s.screen);
  const setDictionary = useGameStore((s) => s.setDictionary);
  const setScreen = useGameStore((s) => s.setScreen);
  const setSettings = useGameStore((s) => s.setSettings);
  const setOpponent = useGameStore((s) => s.setOpponent);
  const setVariant = useGameStore((s) => s.setVariant);
  const game = useGameStore((s) => s.game);

  useEffect(() => {
    void (async () => {
      const [trie, inProgress, names, opponent, variant] = await Promise.all([
        loadDictionary().catch((e: unknown) => {
          console.error("Dictionary load failed", e);
          return null;
        }),
        loadInProgress(),
        getPlayerNames(),
        getOpponent(),
        getVariant(),
      ]);
      if (trie) setDictionary(trie);
      setSettings(names);
      setOpponent(opponent);
      setVariant(variant);
      if (inProgress && inProgress.status.kind !== "ended") {
        setScreen({ kind: "home" });
      } else {
        setScreen({ kind: "home" });
      }
    })();
  }, [setDictionary, setScreen, setSettings, setOpponent, setVariant]);

  switch (screen.kind) {
    case "loading":
      return <LoadingScreen />;
    case "home":
      return <HomeScreen />;
    case "new_game":
      return <NewGameScreen />;
    case "game":
      return <GameScreen />;
    case "handoff": {
      const nextName = game?.players[screen.nextPlayerIndex]?.name ?? "Next player";
      return (
        <HotSeatHandoff
          nextPlayerName={nextName}
          onReady={() => setScreen({ kind: "game" })}
        />
      );
    }
    case "game_end":
      return <GameEndScreen />;
    case "tumbler":
      return <TumblerScreen />;
    case "tumbler_end":
      return <TumblerEndScreen />;
    case "spelling_bee":
      return <SpellingBeeScreen />;
  }
}
