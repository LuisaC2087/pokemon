import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function crearId(): string {
  try {
    if (Crypto.randomUUID) {
      return Crypto.randomUUID();
    }
  } catch {
    // fallback
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await SQLite.openDatabaseAsync("profesores.db");

      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS profesores (
          id TEXT PRIMARY KEY NOT NULL,
          nombre TEXT,
          departamento TEXT,
          datos TEXT NOT NULL DEFAULT '{}',
          actualizado_en TEXT,
          sincronizado INTEGER NOT NULL DEFAULT 1,
          eliminado INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS operaciones_pendientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          profesor_id TEXT NOT NULL,
          tipo TEXT NOT NULL,
          payload TEXT NOT NULL,
          creado_en TEXT NOT NULL
        );
      `);

      return database;
    })();
  }

  return databasePromise;
}

export async function initDatabase(): Promise<void> {
  await getDb();
}

/**
 * Normaliza cualquier objeto o fila de SQLite para conservar todas sus propiedades.
 */
export function normalizar(p: any): any {
  if (!p) return null;

  let datosObj: Record<string, any> = {};
  if (typeof p.datos === "string") {
    try {
      datosObj = JSON.parse(p.datos || "{}");
    } catch {
      datosObj = {};
    }
  } else if (p.datos && typeof p.datos === "object") {
    datosObj = p.datos;
  }

  // Mezclar datos: las propiedades externas sobreescriben datosObj
  const combinado: Record<string, any> = {
    ...datosObj,
    ...p,
  };

  delete combinado.datos;

  const id = String(combinado.id || p.id || "");
  const nombre = combinado.nombre ?? p.nombre ?? "";
  const departamento = combinado.departamento ?? p.departamento ?? "";
  const actualizado_en =
    combinado.actualizado_en ?? p.actualizado_en ?? new Date().toISOString();
  const sincronizado =
    p.sincronizado !== undefined
      ? Number(p.sincronizado)
      : combinado.sincronizado !== undefined
      ? Number(combinado.sincronizado)
      : 1;
  const eliminado =
    p.eliminado !== undefined
      ? Number(p.eliminado)
      : combinado.eliminado !== undefined
      ? Number(combinado.eliminado)
      : 0;

  return {
    ...combinado,
    id,
    nombre,
    departamento,
    actualizado_en,
    sincronizado,
    eliminado,
  };
}

/**
 * Guarda un profesor en SQLite garantizando que se serialicen todas las propiedades
 * en la columna `datos`.
 */
export async function guardarProfesorLocal(
  p: any,
  sincronizado = 0
): Promise<any> {
  const database = await getDb();
  const profesor = normalizar({ ...p, sincronizado });

  const { id, nombre, departamento, actualizado_en, eliminado } = profesor;

  // Guardamos el objeto completo (incluyendo formación, experiencia, etc.) en datos
  const datosJson = JSON.stringify(profesor);

  await database.runAsync(
    `INSERT OR REPLACE INTO profesores
      (id, nombre, departamento, datos, actualizado_en, sincronizado, eliminado)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    nombre,
    departamento,
    datosJson,
    actualizado_en,
    sincronizado,
    eliminado || 0
  );

  return profesor;
}

export async function agregarPendiente(
  id: string,
  tipo: string,
  payload: any
): Promise<void> {
  const database = await getDb();

  await database.runAsync(
    `INSERT INTO operaciones_pendientes
      (profesor_id, tipo, payload, creado_en)
     VALUES (?, ?, ?, ?)`,
    String(id),
    tipo,
    JSON.stringify(payload),
    new Date().toISOString()
  );
}

export async function listarProfesores(): Promise<any[]> {
  const database = await getDb();

  const rows: any[] = await database.getAllAsync(
    `SELECT * FROM profesores
     WHERE eliminado = 0
     ORDER BY nombre COLLATE NOCASE`
  );

  return rows.map((row) => normalizar(row));
}

/**
 * Guarda localmente y añade a operaciones pendientes (para modo offline o fallback).
 */
export async function guardarProfesor(
  p: any,
  idExistente: string | null = null
): Promise<any> {
  const database = await getDb();
  const id = String(idExistente || p.id || crearId());

  const profesor = normalizar({
    ...p,
    id,
    actualizado_en: new Date().toISOString(),
  });

  await guardarProfesorLocal(profesor, 0);

  // Verificar si ya existe una operación pendiente para este profesor
  const pendientes: any[] = await database.getAllAsync(
    `SELECT id, tipo FROM operaciones_pendientes
     WHERE profesor_id = ?
     ORDER BY id`,
    id
  );

  const operacionPost = pendientes.find((op) => op.tipo === "POST");

  if (operacionPost) {
    // Si aún no se ha sincronizado la creación, actualizamos el payload del POST existente
    await database.runAsync(
      `UPDATE operaciones_pendientes
       SET payload = ?, creado_en = ?
       WHERE id = ?`,
      JSON.stringify(profesor),
      new Date().toISOString(),
      operacionPost.id
    );
  } else {
    // Verificar si ya existe en la base de datos (con sincronizado = 1)
    const existente: any = await database.getFirstAsync(
      `SELECT id FROM profesores WHERE id = ?`,
      id
    );

    const operacionPut = pendientes.find((op) => op.tipo === "PUT");

    if (operacionPut) {
      await database.runAsync(
        `UPDATE operaciones_pendientes
         SET payload = ?, creado_en = ?
         WHERE id = ?`,
        JSON.stringify(profesor),
        new Date().toISOString(),
        operacionPut.id
      );
    } else {
      const tipo = idExistente || (p.id && existente) ? "PUT" : "POST";
      await agregarPendiente(id, tipo, profesor);
    }
  }

  return profesor;
}

/**
 * Elimina un profesor localmente y registra la operación DELETE pendiente si corresponde.
 */
export async function eliminarProfesor(id: string): Promise<void> {
  const database = await getDb();
  const idStr = String(id);

  const profesor = await database.getFirstAsync(
    `SELECT * FROM profesores WHERE id = ?`,
    idStr
  );

  if (!profesor) return;

  const pendientes: any[] = await database.getAllAsync(
    `SELECT id, tipo FROM operaciones_pendientes
     WHERE profesor_id = ?
     ORDER BY id`,
    idStr
  );

  const tieneCreacionPendiente = pendientes.some((op) => op.tipo === "POST");

  if (tieneCreacionPendiente) {
    // Si nunca se envió al servidor, solo borramos de pendientes y de profesores locales
    await database.runAsync(
      `DELETE FROM operaciones_pendientes WHERE profesor_id = ?`,
      idStr
    );
    await database.runAsync(
      `DELETE FROM profesores WHERE id = ?`,
      idStr
    );
    return;
  }

  // Si existe en el servidor:
  // Borramos cualquier operación pendiente anterior de este id (ej. PUT pendientes)
  await database.runAsync(
    `DELETE FROM operaciones_pendientes WHERE profesor_id = ?`,
    idStr
  );

  // Marcamos como eliminado localmente y no sincronizado
  await database.runAsync(
    `UPDATE profesores SET eliminado = 1, sincronizado = 0 WHERE id = ?`,
    idStr
  );

  // Agregamos la operación DELETE a la cola de pendientes
  await agregarPendiente(idStr, "DELETE", { id: idStr });
}

/**
 * Elimina permanentemente de SQLite (usado cuando la eliminación remota fue exitosa).
 */
export async function eliminarProfesorLocalDefinitivo(
  id: string
): Promise<void> {
  const database = await getDb();
  const idStr = String(id);

  await database.runAsync(
    `DELETE FROM operaciones_pendientes WHERE profesor_id = ?`,
    idStr
  );
  await database.runAsync(
    `DELETE FROM profesores WHERE id = ?`,
    idStr
  );
}

export async function obtenerPendientes(): Promise<any[]> {
  const database = await getDb();

  return database.getAllAsync(
    `SELECT * FROM operaciones_pendientes ORDER BY id`
  );
}

export async function contarPendientes(): Promise<number> {
  const database = await getDb();

  const res: any = await database.getFirstAsync(
    `SELECT COUNT(*) as total FROM operaciones_pendientes`
  );

  return res ? Number(res.total) : 0;
}

export async function eliminarPendiente(id: number): Promise<void> {
  const database = await getDb();

  await database.runAsync(
    `DELETE FROM operaciones_pendientes WHERE id = ?`,
    id
  );
}

export async function marcarSincronizado(
  id: string,
  tipo: string
): Promise<void> {
  const database = await getDb();
  const idStr = String(id);

  if (tipo === "DELETE") {
    await database.runAsync(
      `DELETE FROM profesores WHERE id = ?`,
      idStr
    );
  } else {
    await database.runAsync(
      `UPDATE profesores
       SET sincronizado = 1, eliminado = 0
       WHERE id = ?`,
      idStr
    );
  }
}

/**
 * Guarda un profesor remoto en SQLite evitando sobreescribir cambios locales pendientes.
 */
export async function guardarProfesorRemoto(p: any): Promise<void> {
  const database = await getDb();
  const id = String(p.id);

  const local: any = await database.getFirstAsync(
    `SELECT sincronizado, eliminado FROM profesores WHERE id = ?`,
    id
  );

  // No sobrescribir cambios locales que aún no se han sincronizado
  if (local && (local.sincronizado === 0 || local.eliminado === 1)) {
    return;
  }

  await guardarProfesorLocal(p, 1);
}

/**
 * Reconcilia la lista remota recibida con la base local:
 * - Actualiza/inserta los remotos (salvo que tengan cambios locales pendientes).
 * - Remueve de SQLite los profesores que ya no existen en el servidor y que estaban marcados sincronizados.
 */
export async function reconciliarProfesoresRemotos(
  remotos: any[]
): Promise<void> {
  const database = await getDb();
  const idsRemotos = new Set<string>();

  for (const p of remotos) {
    if (p && p.id) {
      idsRemotos.add(String(p.id));
      await guardarProfesorRemoto(p);
    }
  }

  // Eliminar registros locales sincronizados que ya no existan en el servidor
  const locales: any[] = await database.getAllAsync(
    `SELECT id, sincronizado, eliminado FROM profesores`
  );

  for (const loc of locales) {
    if (
      loc.sincronizado === 1 &&
      loc.eliminado === 0 &&
      !idsRemotos.has(String(loc.id))
    ) {
      await database.runAsync(
        `DELETE FROM profesores WHERE id = ?`,
        String(loc.id)
      );
    }
  }
}

export async function obtenerProfesorLocal(id: string): Promise<any> {
  const database = await getDb();

  const row = await database.getFirstAsync(
    `SELECT * FROM profesores
     WHERE id = ? AND eliminado = 0`,
    String(id)
  );

  if (!row) return null;

  return normalizar(row);
}

// Alias para compatibilidad hacia atrás
export const obtenerProfesor = obtenerProfesorLocal;
