import React, { createContext, useState } from "react";

export const AppContext = createContext<any>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedPokemon, setSelectedPokemon] = useState<any>(null);
  const [selectedJujutsu, setSelectedJujutsu] = useState<any>(null);

  return (
    <AppContext.Provider
      value={{
        selectedPokemon,
        setSelectedPokemon,
        selectedJujutsu,
        setSelectedJujutsu,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
