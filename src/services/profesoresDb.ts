/**
 * profesoresDb.ts
 * Servicio de base de datos local SQLite para profesores.
 * Maneja la tabla con campos reducidos y sincronización con Supabase (nube).
 */
import * as SQLite from 'expo-sqlite';

export interface ProfesorLocal {
  id: string;             // ID único (mismo id de Supabase)
  nombre: string;
  departamento: string;
  profesion: string;
  email: string;
  telefono: string;
  imagen_url: string;
  is_new: number;         // 1 = nuevo desde última revisión, 0 = ya visto
  synced_at: number;      // timestamp Unix de última sincronización
}

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('profesores.db');
    await initializeDb(db);
  }
  return db;
}

async function initializeDb(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync('PRAGMA journal_mode = WAL;');

  // Migración automática: si la tabla existente tiene 'cloud_id', se recrea con 'id'
  try {
    const tableInfo = await database.getAllAsync<{ name: string }>(
      'PRAGMA table_info(profesores)'
    );
    const hasCloudId = tableInfo.some((col) => col.name === 'cloud_id');
    if (hasCloudId) {
      await database.execAsync('DROP TABLE IF EXISTS profesores;');
    }
  } catch (e) {
    console.warn('Error verificando migración:', e);
  }

  await database.execAsync(`
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

/** Marca un profesor como "visto" (quita el indicador nuevo) */
export async function markProfesorSeen(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync('UPDATE profesores SET is_new = 0 WHERE id = ?', id);
}

/** Marca todos los profesores como vistos */
export async function markAllSeen(): Promise<void> {
  const database = await getDb();
  await database.runAsync('UPDATE profesores SET is_new = 0');
}

/**
 * Sincroniza un array de profesores desde la nube con SQLite.
 * La nube siempre tiene prioridad. Detecta duplicados por id.
 * Retorna el número de registros nuevos insertados.
 */
export async function syncProfesoresFromCloud(
  cloudProfesores: any[]
): Promise<{ inserted: number; updated: number }> {
  const database = await getDb();
  let inserted = 0;
  let updated = 0;
  const now = Date.now();

  for (const prof of cloudProfesores) {
    const id = String(prof.id ?? prof._id ?? '');
    if (!id) continue;

    const existing = await database.getFirstAsync<ProfesorLocal>(
      'SELECT * FROM profesores WHERE id = ?',
      id
    );

    const nombre     = prof.nombre ?? '';
    const depto      = prof.departamento ?? '';
    const profesion  = prof.profesion ?? '';
    const email      = prof.email ?? '';
    const telefono   = String(prof.telefono ?? prof.contactos ?? '');
    const imagenUrl  = prof.imagen_url ?? prof.image_url ?? '';

    if (!existing) {
      // Registro nuevo: insertarlo y marcarlo como nuevo
      await database.runAsync(
        `INSERT INTO profesores (id, nombre, departamento, profesion, email, telefono, imagen_url, is_new, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        id, nombre, depto, profesion, email, telefono, imagenUrl, now
      );
      inserted++;
    } else {
      // Registro existente: la nube tiene prioridad, actualizar datos
      await database.runAsync(
        `UPDATE profesores
         SET nombre=?, departamento=?, profesion=?, email=?, telefono=?, imagen_url=?, synced_at=?
         WHERE id=?`,
        nombre, depto, profesion, email, telefono, imagenUrl, now, id
      );
      updated++;
    }
  }

  // La nube tiene prioridad: eliminar localmente registros que ya no existan en la nube
  const cloudIds = cloudProfesores.map((p) => String(p.id ?? p._id ?? '')).filter(Boolean);
  if (cloudIds.length > 0) {
    const placeholders = cloudIds.map(() => '?').join(',');
    await database.runAsync(
      `DELETE FROM profesores WHERE id NOT IN (${placeholders})`,
      ...cloudIds
    );
  }

  // Guardar timestamp de última sincronización exitosa
  await database.runAsync(
    `INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_sync', ?)`,
    String(now)
  );

  return { inserted, updated };
}

/** Obtiene el timestamp de la última sincronización */
export async function getLastSyncTimestamp(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = 'last_sync'`
  );
  return row ? parseInt(row.value, 10) : 0;
}
