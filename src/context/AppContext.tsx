import { createContext, useState } from "react";
import type { ReactNode } from "react";

export const AppContext = createContext<any>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPokemon, setSelectedPokemon] = useState<any>(null);
  const [selectedJujutsu, setSelectedJujutsu] = useState<any>(null);
  const [selectedProfesor, setSelectedProfesor] = useState<any>(null);

  return (
    <AppContext.Provider
      value={{
        selectedPokemon,
        setSelectedPokemon,
        selectedJujutsu,
        setSelectedJujutsu,
        selectedProfesor,
        setSelectedProfesor,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
