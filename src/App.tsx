import { useGameStore } from "./store/gameStore.js";
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
  const setScreen = useGameStore((s) => s.setScreen);
  const game = useGameStore((s) => s.game);

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
