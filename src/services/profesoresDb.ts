/**
 * profesoresDb.ts
 * Servicio de base de datos local SQLite para profesores.
 * Optimizado para minimizar operaciones de disco y evitar re-renders innecesarios.
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

export interface SyncResult {
  inserted: number;
  updated: number;
  deleted: number;
  hasChanges: boolean;
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
      is_new       INTEGER NOT NULL DEFAULT 1,
      synced_at    INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sync_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
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

/**
 * Sincroniza profesores de la nube con SQLite de forma inteligente.
 * Solo escribe en SQLite si realmente hay cambios, evitando escrituras redundantes.
 */
export async function syncProfesoresFromCloud(
  cloudProfesores: any[]
): Promise<SyncResult> {
  const database = await getDb();
  const now = Date.now();

  // 1. Cargar el estado local en una sola consulta en memoria
  const localList = await database.getAllAsync<ProfesorLocal>('SELECT * FROM profesores');
  const localMap = new Map<string, ProfesorLocal>(localList.map((p) => [p.id, p]));

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
      // Registro nuevo en la nube: insertar y marcar como nuevo
      await database.runAsync(
        `INSERT INTO profesores (id, nombre, departamento, profesion, email, telefono, imagen_url, is_new, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        id, nombre, depto, profesion, email, telefono, imagenUrl, now
      );
      inserted++;
    } else {
      // Verificar si alguno de los campos realmente cambió antes de actualizar en disco
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

  // 2. Solo eliminar si hay IDs en local que ya no existan en la nube
  if (cloudIds.size > 0 && localList.length > 0) {
    const toDelete = localList.filter((p) => !cloudIds.has(p.id));
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

  return { inserted, updated, deleted, hasChanges };
}

/** Obtiene el timestamp de la última sincronización */
export async function getLastSyncTimestamp(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = 'last_sync'`
  );
  return row ? parseInt(row.value, 10) : 0;
}

/** Elimina un profesor localmente por su ID */
export async function deleteProfesorLocal(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM profesores WHERE id = ?`, id);
}
