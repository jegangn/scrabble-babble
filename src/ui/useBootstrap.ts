import { useEffect } from "react";
import { useGameStore } from "../store/gameStore.js";
import { loadDictionary } from "../data/load-dictionary.js";
import { loadInProgress } from "../storage/game-storage.js";
import {
  getAudioSettings, getCurrentUser, getOpponent, getPlayerNames, getVariant,
} from "../storage/settings-storage.js";
import { setAudioConfig } from "../audio/sounds.js";

/** Boot effects hoisted from App so they run once at the router level,
 *  regardless of which device path renders. Behaviour is unchanged. */
export function useBootstrap(): void {
  const setDictionary = useGameStore((s) => s.setDictionary);
  const setScreen = useGameStore((s) => s.setScreen);
  const setSettings = useGameStore((s) => s.setSettings);
  const setOpponent = useGameStore((s) => s.setOpponent);
  const setVariant = useGameStore((s) => s.setVariant);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);

  useEffect(() => {
    void (async () => {
      const audio = await getAudioSettings().catch(() => null);
      if (audio) setAudioConfig(audio);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const [trie, inProgress, names, opponent, variant, user] = await Promise.all([
        loadDictionary().catch((e: unknown) => { console.error("Dictionary load failed", e); return null; }),
        loadInProgress().catch((e: unknown) => { console.error("Load in-progress failed", e); return null; }),
        getPlayerNames().catch((e: unknown) => { console.error("Load player names failed", e); return ["Player 1", "Player 2"] as [string, string]; }),
        getOpponent().catch((e: unknown) => { console.error("Load opponent failed", e); return { kind: "human" } as const; }),
        getVariant().catch((e: unknown) => { console.error("Load variant failed", e); return "classic" as const; }),
        getCurrentUser().catch((e: unknown) => { console.error("Load current user failed", e); return null; }),
      ]);
      if (trie) setDictionary(trie);
      setSettings(names);
      setOpponent(opponent);
      setVariant(variant);
      if (user) setCurrentUser(user);
      void inProgress;
      await new Promise((resolve) => setTimeout(resolve, 200));
      setScreen({ kind: "home" });
    })();
  }, [setDictionary, setScreen, setSettings, setOpponent, setVariant, setCurrentUser]);
}
