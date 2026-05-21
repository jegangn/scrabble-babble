import { useEffect } from "react";
import { useGameStore } from "./store/gameStore.js";
import { loadDictionary } from "./data/load-dictionary.js";
import { loadInProgress } from "./storage/game-storage.js";
import {
  getAudioSettings,
  getCurrentUser,
  getOpponent,
  getPlayerNames,
  getVariant,
} from "./storage/settings-storage.js";
import { setAudioConfig } from "./audio/sounds.js";
import { LoadingScreen } from "./ui/screens/LoadingScreen.js";
import { HomeScreen } from "./ui/screens/HomeScreen.js";
import { NewGameScreen } from "./ui/screens/NewGameScreen.js";
import { GameScreen } from "./ui/screens/GameScreen.js";
import { GameEndScreen } from "./ui/screens/GameEndScreen.js";
import { TumblerScreen } from "./ui/screens/TumblerScreen.js";
import { TumblerEndScreen } from "./ui/screens/TumblerEndScreen.js";
import { SpellingBeeScreen } from "./ui/screens/SpellingBeeScreen.js";
import { ScoresScreen } from "./ui/screens/ScoresScreen.js";
import { HotSeatHandoff } from "./ui/components/HotSeatHandoff.js";

export function App(): JSX.Element {
  const screen = useGameStore((s) => s.screen);
  const setDictionary = useGameStore((s) => s.setDictionary);
  const setScreen = useGameStore((s) => s.setScreen);
  const setSettings = useGameStore((s) => s.setSettings);
  const setOpponent = useGameStore((s) => s.setOpponent);
  const setVariant = useGameStore((s) => s.setVariant);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);
  const game = useGameStore((s) => s.game);

  // Audio settings get their own fast-path effect: the main load Promise.all
  // is gated by the dictionary download, but sound config is local-only and
  // should apply the moment the user can interact with anything.
  useEffect(() => {
    void (async () => {
      const audio = await getAudioSettings().catch(() => null);
      if (audio) setAudioConfig(audio);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      // Every load is wrapped so a corrupt IndexedDB or a missing wordlist
      // doesn't strand the user on the loading screen. Defaults are sane.
      const [trie, inProgress, names, opponent, variant, user] = await Promise.all([
        loadDictionary().catch((e: unknown) => {
          console.error("Dictionary load failed", e);
          return null;
        }),
        loadInProgress().catch((e: unknown) => {
          console.error("Load in-progress failed", e);
          return null;
        }),
        getPlayerNames().catch((e: unknown) => {
          console.error("Load player names failed", e);
          return ["Player 1", "Player 2"] as [string, string];
        }),
        getOpponent().catch((e: unknown) => {
          console.error("Load opponent failed", e);
          return { kind: "human" } as const;
        }),
        getVariant().catch((e: unknown) => {
          console.error("Load variant failed", e);
          return "classic" as const;
        }),
        getCurrentUser().catch((e: unknown) => {
          console.error("Load current user failed", e);
          return null;
        }),
      ]);
      if (trie) setDictionary(trie);
      setSettings(names);
      setOpponent(opponent);
      setVariant(variant);
      if (user) setCurrentUser(user);
      // Always land on Home — Resume button availability is computed there.
      void inProgress;
      // Give LoadingScreen 200 ms to fade out before we swap screens, so
      // the transition reads as a fade rather than a cut. The splash's
      // own opacity transition is driven by `dictionary !== null`, which
      // flipped on the setDictionary(trie) call above.
      await new Promise((resolve) => setTimeout(resolve, 200));
      setScreen({ kind: "home" });
    })();
  }, [setDictionary, setScreen, setSettings, setOpponent, setVariant, setCurrentUser]);

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
    case "scores":
      return <ScoresScreen />;
  }
}
