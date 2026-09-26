import React, { createContext, useState, ReactNode } from 'react';

type PokemonContextType = {
  pokemon: any;
  setPokemon: (pokemon: any) => void;
  mensaje: string;
  setMensaje: (mensaje: string) => void;
};

export const PokemonContext = createContext<PokemonContextType>({
  pokemon: null,
  setPokemon: () => {},
  mensaje: "",
  setMensaje: () => {},
});

export const PokemonProvider = ({ children }: { children: ReactNode }) => {
  const [pokemon, setPokemon] = useState<any>(null);
  const [mensaje, setMensaje] = useState("");

  return (
    <PokemonContext.Provider value={{ pokemon, setPokemon, mensaje, setMensaje }}>
      {children}
    </PokemonContext.Provider>
  );
};
