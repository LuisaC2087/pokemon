/**
 * profesoresDb.web.ts
 * Implementación web para almacenamiento local de profesores usando localStorage
 * con soporte para cola de sincronización bidireccional (Offline-First Sync Queue / Outbox Pattern).
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

export interface SyncQueueItem {
  id: string;
  entity_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  payload?: string;
  created_at: number;
}

export interface SyncResult {
  inserted: number;
  updated: number;
  deleted: number;
  hasChanges: boolean;
  pushedCount: number;
}

const STORAGE_KEY = 'pokemon_profesores_local_db';
const SYNC_QUEUE_KEY = 'pokemon_profesores_sync_queue';
const SYNC_META_KEY = 'pokemon_profesores_last_sync';

let memoryProfesores: ProfesorLocal[] = [];
let memoryQueue: SyncQueueItem[] = [];

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

function readQueue(): SyncQueueItem[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(SYNC_QUEUE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error leyendo sync_queue en localStorage:', err);
  }
  return memoryQueue;
}

function writeQueue(items: SyncQueueItem[]): void {
  memoryQueue = items;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items));
    }
  } catch (err) {
    console.warn('Error escribiendo sync_queue en localStorage:', err);
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

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return readQueue().sort((a, b) => a.created_at - b.created_at);
}

/**
 * Encola la eliminación de un profesor localmente:
 * 1. Lo elimina de localStorage inmediatamente para respuesta visual instantánea.
 * 2. Registra la acción DELETE en la cola de sincronización.
 */
export async function queueDeleteProfesor(id: string): Promise<void> {
  // 1. Eliminar de datos locales
  const list = readStorage();
  const updatedList = list.filter((p) => p.id !== id);
  writeStorage(updatedList);

  // 2. Limpiar acciones pendientes previas sobre la misma entidad
  const queue = readQueue().filter((q) => q.entity_id !== id);

  // 3. Agregar acción DELETE
  const queueId = `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  queue.push({
    id: queueId,
    entity_id: id,
    action: 'DELETE',
    created_at: Date.now(),
  });
  writeQueue(queue);
}

/** Alias de compatibilidad */
export async function deleteProfesorLocal(id: string): Promise<void> {
  await queueDeleteProfesor(id);
}

/**
 * Encola la inserción de un nuevo profesor:
 * 1. Lo guarda en localStorage de inmediato.
 * 2. Lo encola para envío a la nube en la próxima sincronización.
 */
export async function queueInsertProfesor(profesor: ProfesorLocal): Promise<void> {
  const list = readStorage();
  const now = Date.now();
  const index = list.findIndex((p) => p.id === profesor.id);
  const updatedItem: ProfesorLocal = { ...profesor, is_new: 0, synced_at: now };

  if (index >= 0) {
    list[index] = updatedItem;
  } else {
    list.unshift(updatedItem);
  }
  writeStorage(list);

  const queue = readQueue();
  const queueId = `ins_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const payload = JSON.stringify({
    id: profesor.id,
    nombre: profesor.nombre,
    departamento: profesor.departamento,
    profesion: profesor.profesion,
    email: profesor.email,
    telefono: profesor.telefono,
    imagen_url: profesor.imagen_url,
  });

  queue.push({
    id: queueId,
    entity_id: profesor.id,
    action: 'INSERT',
    payload,
    created_at: now,
  });
  writeQueue(queue);
}

/**
 * Encola la actualización de un profesor existente.
 */
export async function queueUpdateProfesor(profesor: ProfesorLocal): Promise<void> {
  const list = readStorage();
  const now = Date.now();
  const index = list.findIndex((p) => p.id === profesor.id);

  if (index >= 0) {
    list[index] = { ...list[index], ...profesor, synced_at: now };
    writeStorage(list);
  }

  const queue = readQueue();
  const queueId = `upd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const payload = JSON.stringify({
    nombre: profesor.nombre,
    departamento: profesor.departamento,
    profesion: profesor.profesion,
    email: profesor.email,
    telefono: profesor.telefono,
    imagen_url: profesor.imagen_url,
  });

  const existingInsertIndex = queue.findIndex((q) => q.entity_id === profesor.id && q.action === 'INSERT');
  if (existingInsertIndex >= 0) {
    queue[existingInsertIndex].payload = JSON.stringify({
      id: profesor.id,
      nombre: profesor.nombre,
      departamento: profesor.departamento,
      profesion: profesor.profesion,
      email: profesor.email,
      telefono: profesor.telefono,
      imagen_url: profesor.imagen_url,
    });
  } else {
    const filteredQueue = queue.filter((q) => !(q.entity_id === profesor.id && q.action === 'UPDATE'));
    filteredQueue.push({
      id: queueId,
      entity_id: profesor.id,
      action: 'UPDATE',
      payload,
      created_at: now,
    });
    writeQueue(filteredQueue);
    return;
  }
  writeQueue(queue);
}

/**
 * Procesa la cola de sincronización (Fase PUSH) enviando mutaciones locales a la nube.
 */
export async function processSyncQueue(baseUrl: string): Promise<number> {
  const queue = await getSyncQueue();
  let processed = 0;
  const remaining: SyncQueueItem[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      if (item.action === 'DELETE') {
        const res = await fetch(`${baseUrl}/profesores/${item.entity_id}`, {
          method: 'DELETE',
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok || res.status === 404) {
          processed++;
          continue; // Procesado exitosamente, no se agrega a remaining
        }
      } else if (item.action === 'INSERT') {
        const res = await fetch(`${baseUrl}/profesores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: item.payload,
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok || res.status === 409) {
          processed++;
          continue;
        }
      } else if (item.action === 'UPDATE') {
        const res = await fetch(`${baseUrl}/profesores/${item.entity_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: item.payload,
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok || res.status === 404) {
          processed++;
          continue;
        }
      }
      remaining.push(item);
    } catch (err) {
      console.warn('Interrupción al procesar cola de sincronización (web):', err);
      // Mantener este y los siguientes en la cola
      remaining.push(item, ...queue.slice(i + 1));
      break;
    }
  }

  writeQueue(remaining);
  return processed;
}

/**
 * Sincroniza desde la nube respetando mutaciones locales pendientes (Fase PULL).
 */
export async function syncProfesoresFromCloud(cloudProfesores: any[]): Promise<SyncResult> {
  const queue = await getSyncQueue();
  const pendingDeletes = new Set<string>(queue.filter((q) => q.action === 'DELETE').map((q) => q.entity_id));
  const pendingMutations = new Set<string>(queue.filter((q) => q.action === 'INSERT' || q.action === 'UPDATE').map((q) => q.entity_id));

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

    // Si el usuario eliminó este registro localmente, no re-insertar
    if (pendingDeletes.has(id)) {
      continue;
    }

    // Evitar procesar duplicados si el mismo ID viene más de una vez en el payload
    if (cloudIds.has(id)) {
      continue;
    }
    cloudIds.add(id);

    // Si hay una mutación local no sincronizada, respetar datos locales
    if (pendingMutations.has(id)) {
      continue;
    }

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
        is_new: 0,
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

  // Eliminar los que ya no existan en la nube (a menos que tengan un INSERT pendiente)
  if (cloudIds.size > 0 && localList.length > 0) {
    for (const key of localMap.keys()) {
      if (!cloudIds.has(key) && !pendingMutations.has(key)) {
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

  return { inserted, updated, deleted, hasChanges, pushedCount: 0 };
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
