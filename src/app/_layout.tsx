import { Stack } from "expo-router";
import { PokemonProvider } from "../context/PokemonContext";
import { JujutsuProvider } from "../context/JujutsuContext";

export default function RootLayout() {
  return (
    <PokemonProvider>
      <JujutsuProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </JujutsuProvider>
    </PokemonProvider>
  );
}