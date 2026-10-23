/**
 * profesoresDb.ts
 * Servicio de base de datos local SQLite para profesores con soporte para
 * sincronización bidireccional (Offline-First Sync Queue / Outbox Pattern).
 */
import * as SQLite from 'expo-sqlite';

export interface ProfesorLocal {
  id: string;             // ID único de Supabase / SQLite
  nombre: string;
  departamento: string;
  profesion: string;
  email: string;
  telefono: string;
  imagen_url: string;
  is_new: number;         // 1 = nuevo desde última revisión, 0 = ya visto
  synced_at: number;      // timestamp Unix de última sincronización
}

export interface SyncQueueItem {
  id: string;
  entity_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  payload?: string;       // JSON string de los datos
  created_at: number;
}

export interface SyncResult {
  inserted: number;
  updated: number;
  deleted: number;
  hasChanges: boolean;
  pushedCount: number;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('profesores.db');
    await initializeDb(dbInstance);
  }
  return dbInstance;
}

async function initializeDb(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS profesores (
      id           TEXT    PRIMARY KEY NOT NULL,
      nombre       TEXT    NOT NULL,
      departamento TEXT    NOT NULL DEFAULT '',
      profesion    TEXT    NOT NULL DEFAULT '',
      email        TEXT    NOT NULL DEFAULT '',
      telefono     TEXT    NOT NULL DEFAULT '',
      imagen_url   TEXT    NOT NULL DEFAULT '',
      is_new       INTEGER NOT NULL DEFAULT 0,
      synced_at    INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sync_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id         TEXT    PRIMARY KEY NOT NULL,
      entity_id  TEXT    NOT NULL,
      action     TEXT    NOT NULL,
      payload    TEXT,
      created_at INTEGER NOT NULL
    );
  `);
}

/** Obtiene todos los profesores de SQLite */
export async function getAllProfesoresLocal(): Promise<ProfesorLocal[]> {
  const database = await getDb();
  return database.getAllAsync<ProfesorLocal>('SELECT * FROM profesores ORDER BY synced_at DESC');
}

/** Obtiene la cantidad de registros marcados como nuevos */
export async function countNewProfesores(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM profesores WHERE is_new = 1'
  );
  return row?.count ?? 0;
}

/** Marca un profesor como visto */
export async function markProfesorSeen(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync('UPDATE profesores SET is_new = 0 WHERE id = ?', id);
}

/** Marca todos los profesores como vistos */
export async function markAllSeen(): Promise<void> {
  const database = await getDb();
  await database.runAsync('UPDATE profesores SET is_new = 0 WHERE is_new = 1');
}

/** Obtiene todos los elementos pendientes en la cola de sincronización */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const database = await getDb();
  return database.getAllAsync<SyncQueueItem>('SELECT * FROM sync_queue ORDER BY created_at ASC');
}

/** Elimina un item de la cola de sincronización una vez procesado */
async function removeQueueItem(queueId: string): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM sync_queue WHERE id = ?', queueId);
}

/**
 * Encola la eliminación de un profesor localmente:
 * 1. Lo borra de la tabla SQLite local inmediatamente para feedback visual instantáneo.
 * 2. Lo registra en la cola de sincronización para que se elimine en la nube al sincronizar.
 */
export async function queueDeleteProfesor(id: string): Promise<void> {
  const database = await getDb();
  const queueId = `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Eliminar de profesores local
  await database.runAsync('DELETE FROM profesores WHERE id = ?', id);

  // Limpiar cualquier acción previa pendiente sobre esta misma entidad
  await database.runAsync('DELETE FROM sync_queue WHERE entity_id = ?', id);

  // Registrar orden de eliminación para la nube
  await database.runAsync(
    'INSERT INTO sync_queue (id, entity_id, action, created_at) VALUES (?, ?, ?, ?)',
    queueId, id, 'DELETE', Date.now()
  );
}

/** Alias de compatibilidad */
export async function deleteProfesorLocal(id: string): Promise<void> {
  await queueDeleteProfesor(id);
}

/**
 * Encola la creación de un nuevo profesor:
 * 1. Lo inserta en SQLite de inmediato.
 * 2. Lo encola para envío a la nube vía POST en la próxima sincronización.
 */
export async function queueInsertProfesor(profesor: ProfesorLocal): Promise<void> {
  const database = await getDb();
  const queueId = `ins_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  await database.runAsync(
    `INSERT OR REPLACE INTO profesores (id, nombre, departamento, profesion, email, telefono, imagen_url, is_new, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    profesor.id, profesor.nombre, profesor.departamento, profesor.profesion,
    profesor.email, profesor.telefono, profesor.imagen_url, 0, now
  );

  const payload = JSON.stringify({
    id: profesor.id,
    nombre: profesor.nombre,
    departamento: profesor.departamento,
    profesion: profesor.profesion,
    email: profesor.email,
    telefono: profesor.telefono,
    imagen_url: profesor.imagen_url,
  });

  await database.runAsync(
    'INSERT INTO sync_queue (id, entity_id, action, payload, created_at) VALUES (?, ?, ?, ?, ?)',
    queueId, profesor.id, 'INSERT', payload, now
  );
}

/**
 * Encola la actualización de un profesor existente:
 * 1. Lo actualiza en SQLite de inmediato.
 * 2. Lo encola para envío a la nube vía PUT en la próxima sincronización.
 */
export async function queueUpdateProfesor(profesor: ProfesorLocal): Promise<void> {
  const database = await getDb();
  const queueId = `upd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  await database.runAsync(
    `UPDATE profesores
     SET nombre=?, departamento=?, profesion=?, email=?, telefono=?, imagen_url=?, synced_at=?
     WHERE id=?`,
    profesor.nombre, profesor.departamento, profesor.profesion,
    profesor.email, profesor.telefono, profesor.imagen_url, now, profesor.id
  );

  const payload = JSON.stringify({
    nombre: profesor.nombre,
    departamento: profesor.departamento,
    profesion: profesor.profesion,
    email: profesor.email,
    telefono: profesor.telefono,
    imagen_url: profesor.imagen_url,
  });

  // Si ya existía un INSERT pendiente, actualizamos su payload directamente
  const existingInsert = await database.getFirstAsync<SyncQueueItem>(
    "SELECT * FROM sync_queue WHERE entity_id = ? AND action = 'INSERT'",
    profesor.id
  );

  if (existingInsert) {
    const updatedInsertPayload = JSON.stringify({
      id: profesor.id,
      nombre: profesor.nombre,
      departamento: profesor.departamento,
      profesion: profesor.profesion,
      email: profesor.email,
      telefono: profesor.telefono,
      imagen_url: profesor.imagen_url,
    });
    await database.runAsync(
      'UPDATE sync_queue SET payload = ? WHERE id = ?',
      updatedInsertPayload, existingInsert.id
    );
  } else {
    // Si ya existía un UPDATE previo, reemplazarlo
    await database.runAsync("DELETE FROM sync_queue WHERE entity_id = ? AND action = 'UPDATE'", profesor.id);
    await database.runAsync(
      'INSERT INTO sync_queue (id, entity_id, action, payload, created_at) VALUES (?, ?, ?, ?, ?)',
      queueId, profesor.id, 'UPDATE', payload, now
    );
  }
}

/**
 * Procesa la cola de sincronización (Fase PUSH):
 * Envía todas las operaciones locales pendientes (INSERT, UPDATE, DELETE) al servidor.
 */
export async function processSyncQueue(baseUrl: string): Promise<number> {
  const database = await getDb();
  const queue = await getSyncQueue();
  let processed = 0;

  for (const item of queue) {
    try {
      if (item.action === 'DELETE') {
        const res = await fetch(`${baseUrl}/profesores/${item.entity_id}`, {
          method: 'DELETE',
          signal: AbortSignal.timeout(25000),
        });
        // Si fue exitoso o ya no existe en el servidor (404), damos por completada la eliminación
        if (res.ok || res.status === 404) {
          await removeQueueItem(item.id);
          processed++;
        }
      } else if (item.action === 'INSERT') {
        const res = await fetch(`${baseUrl}/profesores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: item.payload,
          signal: AbortSignal.timeout(25000),
        });
        // 200, 201 o 409 (ya existe)
        if (res.ok || res.status === 409) {
          await removeQueueItem(item.id);
          processed++;
        }
      } else if (item.action === 'UPDATE') {
        const res = await fetch(`${baseUrl}/profesores/${item.entity_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: item.payload,
          signal: AbortSignal.timeout(25000),
        });
        if (res.ok) {
          await removeQueueItem(item.id);
          processed++;
        } else if (res.status === 404) {
          // Si el servidor responde 404, intentar enviarlo como creación para no perder datos
          const postRes = await fetch(`${baseUrl}/profesores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: item.payload,
            signal: AbortSignal.timeout(25000),
          });
          if (postRes.ok || postRes.status === 409) {
            await removeQueueItem(item.id);
            processed++;
          }
        }
      }
    } catch (err) {
      // Interrupción de red: dejamos los items restantes en la cola para el próximo intento
      console.warn('Interrupción al procesar cola de sincronización:', err);
      break;
    }
  }

  return processed;
}

/**
 * Sincroniza profesores de la nube con SQLite de forma inteligente (Fase PULL):
 * Respeta operaciones locales pendientes para evitar "zombies" (reaparición de registros borrados localmente).
 */
export async function syncProfesoresFromCloud(
  cloudProfesores: any[]
): Promise<SyncResult> {
  const database = await getDb();
  const now = Date.now();

  // 1. Obtener mutaciones locales pendientes para no pisar cambios locales no sincronizados
  const queue = await getSyncQueue();
  const pendingDeletes = new Set<string>(queue.filter((q) => q.action === 'DELETE').map((q) => q.entity_id));
  const pendingMutations = new Set<string>(queue.filter((q) => q.action === 'INSERT' || q.action === 'UPDATE').map((q) => q.entity_id));

  // 2. Cargar el estado local en una sola consulta
  const localList = await database.getAllAsync<ProfesorLocal>('SELECT * FROM profesores');
  const localMap = new Map<string, ProfesorLocal>(localList.map((p) => [p.id, p]));

  let inserted = 0;
  let updated = 0;
  let deleted = 0;

  const cloudIds = new Set<string>();

  for (const prof of cloudProfesores) {
    const id = String(prof.id ?? prof._id ?? '').trim();
    if (!id) continue;

    // Si el usuario borró este registro localmente, NUNCA re-insertarlo de la nube
    if (pendingDeletes.has(id)) {
      continue;
    }

    // Evitar procesar duplicados si el mismo ID viene más de una vez en el payload
    if (cloudIds.has(id)) {
      continue;
    }
    cloudIds.add(id);

    // Si hay una mutación local pendiente sobre este registro, respetamos la versión local
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
      // Registro nuevo en la nube (INSERT OR REPLACE previene colisiones)
      await database.runAsync(
        `INSERT OR REPLACE INTO profesores (id, nombre, departamento, profesion, email, telefono, imagen_url, is_new, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        id, nombre, depto, profesion, email, telefono, imagenUrl, now
      );
      localMap.set(id, {
        id, nombre, departamento: depto, profesion, email, telefono, imagen_url: imagenUrl, is_new: 0, synced_at: now
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
        await database.runAsync(
          `UPDATE profesores
           SET nombre=?, departamento=?, profesion=?, email=?, telefono=?, imagen_url=?, synced_at=?
           WHERE id=?`,
          nombre, depto, profesion, email, telefono, imagenUrl, now, id
        );
        updated++;
      }
    }
  }

  // 3. Eliminar localmente registros que hayan sido borrados en la nube solo si la nube respondió con datos válidos
  if (Array.isArray(cloudProfesores) && cloudProfesores.length > 0 && localList.length > 0) {
    const toDelete = localList.filter((p) => !cloudIds.has(p.id) && !pendingMutations.has(p.id) && !pendingDeletes.has(p.id));
    if (toDelete.length > 0) {
      const placeholders = toDelete.map(() => '?').join(',');
      await database.runAsync(
        `DELETE FROM profesores WHERE id IN (${placeholders})`,
        ...toDelete.map((p) => p.id)
      );
      deleted = toDelete.length;
    }
  }

  const hasChanges = inserted > 0 || updated > 0 || deleted > 0;

  if (hasChanges) {
    await database.runAsync(
      `INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_sync', ?)`,
      String(now)
    );
  }

  return { inserted, updated, deleted, hasChanges, pushedCount: 0 };
}

/** Obtiene el timestamp de la última sincronización */
export async function getLastSyncTimestamp(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = 'last_sync'`
  );
  return row ? parseInt(row.value, 10) : 0;
}
