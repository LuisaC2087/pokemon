/**
 * profesoresDb.web.ts
 * Implementación web para almacenamiento local de profesores usando localStorage.
 * Evita la dependencia de wa-sqlite.wasm que rompe el empaquetado en web/Render.
 */

export interface ProfesorLocal {
  id: string;
  nombre: string;
  departamento: string;
  profesion: string;
  email: string;
  telefono: string;
  imagen_url: string;
  is_new: number;
  synced_at: number;
}

export interface SyncResult {
  inserted: number;
  updated: number;
  deleted: number;
  hasChanges: boolean;
}

const STORAGE_KEY = 'pokemon_profesores_local_db';
const SYNC_META_KEY = 'pokemon_profesores_last_sync';

let memoryProfesores: ProfesorLocal[] = [];

function readStorage(): ProfesorLocal[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error leyendo localStorage:', err);
  }
  return memoryProfesores;
}

function writeStorage(items: ProfesorLocal[]): void {
  memoryProfesores = items;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  } catch (err) {
    console.warn('Error escribiendo localStorage:', err);
  }
}

export async function getAllProfesoresLocal(): Promise<ProfesorLocal[]> {
  const list = readStorage();
  return [...list].sort((a, b) => b.synced_at - a.synced_at);
}

export async function countNewProfesores(): Promise<number> {
  const list = readStorage();
  return list.filter((p) => p.is_new === 1).length;
}

export async function markProfesorSeen(id: string): Promise<void> {
  const list = readStorage();
  const updated = list.map((p) => (p.id === id ? { ...p, is_new: 0 } : p));
  writeStorage(updated);
}

export async function markAllSeen(): Promise<void> {
  const list = readStorage();
  const updated = list.map((p) => ({ ...p, is_new: 0 }));
  writeStorage(updated);
}

export async function syncProfesoresFromCloud(cloudProfesores: any[]): Promise<SyncResult> {
  const localList = readStorage();
  const localMap = new Map<string, ProfesorLocal>(localList.map((p) => [p.id, p]));
  const now = Date.now();

  let inserted = 0;
  let updated = 0;
  let deleted = 0;

  const cloudIds = new Set<string>();

  for (const prof of cloudProfesores) {
    const id = String(prof.id ?? prof._id ?? '').trim();
    if (!id) continue;
    cloudIds.add(id);

    const nombre = (prof.nombre ?? '').trim();
    const depto = (prof.departamento ?? '').trim();
    const profesion = (prof.profesion ?? '').trim();
    const email = (prof.email ?? '').trim();
    const telefono = String(prof.telefono ?? prof.contactos ?? '').trim();
    const imagenUrl = (prof.imagen_url ?? prof.image_url ?? '').trim();

    const local = localMap.get(id);

    if (!local) {
      localMap.set(id, {
        id,
        nombre,
        departamento: depto,
        profesion,
        email,
        telefono,
        imagen_url: imagenUrl,
        is_new: 1,
        synced_at: now,
      });
      inserted++;
    } else {
      const cambio =
        local.nombre !== nombre ||
        local.departamento !== depto ||
        local.profesion !== profesion ||
        local.email !== email ||
        local.telefono !== telefono ||
        local.imagen_url !== imagenUrl;

      if (cambio) {
        localMap.set(id, {
          ...local,
          nombre,
          departamento: depto,
          profesion,
          email,
          telefono,
          imagen_url: imagenUrl,
          synced_at: now,
        });
        updated++;
      }
    }
  }

  // Eliminar los que ya no existan en la nube
  if (cloudIds.size > 0 && localList.length > 0) {
    for (const key of localMap.keys()) {
      if (!cloudIds.has(key)) {
        localMap.delete(key);
        deleted++;
      }
    }
  }

  const hasChanges = inserted > 0 || updated > 0 || deleted > 0;

  if (hasChanges) {
    writeStorage(Array.from(localMap.values()));
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SYNC_META_KEY, String(now));
      }
    } catch {
      // ignorar
    }
  }

  return { inserted, updated, deleted, hasChanges };
}

export async function getLastSyncTimestamp(): Promise<number> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(SYNC_META_KEY);
      return val ? parseInt(val, 10) : 0;
    }
  } catch {
    // ignorar
  }
  return 0;
}

export async function deleteProfesorLocal(id: string): Promise<void> {
  const list = readStorage();
  const updated = list.filter((p) => p.id !== id);
  writeStorage(updated);
}
