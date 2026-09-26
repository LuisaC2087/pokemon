import React, { createContext, useState, ReactNode } from "react";

type JujutsuContextType = {
  personaje: any;
  setPersonaje: (personaje: any) => void;
  mensaje: string;
  setMensaje: (mensaje: string) => void;
};

export const JujutsuContext = createContext<JujutsuContextType>({
  personaje: null,
  setPersonaje: () => {},
  mensaje: "",
  setMensaje: () => {},
});

export const JujutsuProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [personaje, setPersonaje] = useState<any>(null);
  const [mensaje, setMensaje] = useState("");

  return (
    <JujutsuContext.Provider
      value={{
        personaje,
        setPersonaje,
        mensaje,
        setMensaje,
      }}
    >
      {children}
    </JujutsuContext.Provider>
  );
};