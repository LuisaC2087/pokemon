import { createContext, useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import {
  syncProfesoresFromCloud,
  getAllProfesoresLocal,
  countNewProfesores,
  markAllSeen,
  processSyncQueue,
  type ProfesorLocal,
} from "../services/profesoresDb";

const BASE_URL = "https://profesores-node-ueas.onrender.com";

export type SyncInterval = 2 | 10 | 30; // segundos

export interface SyncState {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  newCount: number;       // cantidad de profesores nuevos no vistos
  error: string | null;
  totalLocal: number;
}

interface AppContextType {
  // Pokémon / Jujutsu
  selectedPokemon: any;
  setSelectedPokemon: (p: any) => void;
  selectedJujutsu: any;
  setSelectedJujutsu: (j: any) => void;

  // Profesores
  selectedProfesor: any;
  setSelectedProfesor: (p: any) => void;

  // Sync
  syncInterval: SyncInterval;
  setSyncInterval: (interval: SyncInterval) => void;
  syncState: SyncState;
  localProfesores: ProfesorLocal[];
  triggerSync: () => Promise<void>;
  markAllProfesoresSeen: () => Promise<void>;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPokemon, setSelectedPokemon] = useState<any>(null);
  const [selectedJujutsu, setSelectedJujutsu] = useState<any>(null);
  const [selectedProfesor, setSelectedProfesor] = useState<any>(null);

  const [syncInterval, setSyncInterval] = useState<SyncInterval>(10);
  const [localProfesores, setLocalProfesores] = useState<ProfesorLocal[]>([]);
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncAt: null,
    newCount: 0,
    error: null,
    totalLocal: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef(false);

  const refreshLocal = useCallback(async () => {
    try {
      const profs = await getAllProfesoresLocal();
      const newCount = await countNewProfesores();
      setLocalProfesores(profs);
      setSyncState((prev) => ({ ...prev, newCount, totalLocal: profs.length }));
    } catch (e) {
      // silently fail on refresh
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncState((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      // 1. FASE PUSH: Enviar mutaciones locales pendientes (eliminaciones, inserciones, actualizaciones)
      const pushedCount = await processSyncQueue(BASE_URL);

      // 2. FASE PULL: Obtener datos actualizados de la nube
      const res = await fetch(`${BASE_URL}/profesores`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cloudData = await res.json();

      if (Array.isArray(cloudData)) {
        // 3. FASE RECONCILIACIÓN: Actualizar BD local respetando cambios en cola
        const syncResult = await syncProfesoresFromCloud(cloudData);

        // Si hubo cambios locales o se enviaron mutaciones a la nube, recargar estado
        if (syncResult.hasChanges || pushedCount > 0) {
          const profs = await getAllProfesoresLocal();
          const newCount = await countNewProfesores();
          setLocalProfesores(profs);
          setSyncState({
            isSyncing: false,
            lastSyncAt: new Date(),
            newCount,
            error: null,
            totalLocal: profs.length,
          });
        } else {
          setSyncState((prev) => ({
            ...prev,
            isSyncing: false,
            lastSyncAt: new Date(),
            error: null,
          }));
        }
      }
    } catch (err: any) {
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        error: err.message ?? "Error de sincronización",
      }));
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  const markAllProfesoresSeen = useCallback(async () => {
    await markAllSeen();
    await refreshLocal();
  }, [refreshLocal]);

  // Carga inicial: cargar datos locales de inmediato y luego sincronizar en segundo plano
  useEffect(() => {
    refreshLocal().then(() => triggerSync());
  }, []);

  // Sync periódico basado en el intervalo seleccionado
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      triggerSync();
    }, syncInterval * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [syncInterval, triggerSync]);

  return (
    <AppContext.Provider
      value={{
        selectedPokemon,
        setSelectedPokemon,
        selectedJujutsu,
        setSelectedJujutsu,
        selectedProfesor,
        setSelectedProfesor,
        syncInterval,
        setSyncInterval,
        syncState,
        localProfesores,
        triggerSync,
        markAllProfesoresSeen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
