import { useGameStore } from "../../store/gameStore.js";
import { LoadingScreen } from "../screens/LoadingScreen.js";
import { HotSeatHandoff } from "../components/HotSeatHandoff.js";
import { PhonePlaceholder } from "./PhonePlaceholder.js";
import { PhoneHome } from "./screens/PhoneHome.js";
import { PhoneScores } from "./screens/PhoneScores.js";
import { PhoneNewGame } from "./screens/PhoneNewGame.js";
import { PhoneGame } from "./screens/PhoneGame.js";
import { PhoneGameEnd } from "./screens/PhoneGameEnd.js";
import { PhoneTumbler } from "./screens/PhoneTumbler.js";

export function PhoneApp(): JSX.Element {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const game = useGameStore((s) => s.game);
  switch (screen.kind) {
    case "loading": return <LoadingScreen />;
    case "home": return <PhoneHome />;
    case "new_game": return <PhoneNewGame />;
    case "game": return <PhoneGame />;
    case "handoff": {
      const nextName = game?.players[screen.nextPlayerIndex]?.name ?? "Next player";
      return <HotSeatHandoff nextPlayerName={nextName} onReady={() => setScreen({ kind: "game" })} />;
    }
    case "game_end": return <PhoneGameEnd />;
    case "tumbler": return <PhoneTumbler />;
    case "tumbler_end": return <PhonePlaceholder label="tumbler_end" />;
    case "spelling_bee": return <PhonePlaceholder label="spelling_bee" />;
    case "scores": return <PhoneScores />;
  }
}
