import { Stack } from "expo-router";
import { PokemonProvider } from "../context/PokemonContext";

export default function Layout() {
  return (
    <PokemonProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PokemonProvider>
  );
}
