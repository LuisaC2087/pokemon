
import * as SQLite from "expo-sqlite";

const dbPromise = SQLite.openDatabaseAsync("profesores.db");

export function crearId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (c) => {
      const r = Math.floor(Math.random() * 16);
      return (c === "x" ? r : (r & 3) | 8).toString(16);
    }
  );
}

async function db() {
  const database = await dbPromise;

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
}

export async function initDatabase() {
  await db();
}

function normalizar(p) {
  const datos =
    typeof p.datos === "string"
      ? JSON.parse(p.datos || "{}")
      : p.datos || {};

  return {
    ...datos,
    id: String(p.id),
    nombre: p.nombre ?? datos.nombre ?? "",
    departamento: p.departamento ?? datos.departamento ?? "",
    datos,
    actualizado_en: p.actualizado_en ?? new Date().toISOString(),
  };
}

async function guardarProfesorLocal(p, sincronizado = 0) {
  const database = await db();
  const profesor = normalizar(p);

  await database.runAsync(
    `INSERT OR REPLACE INTO profesores
      (id, nombre, departamento, datos, actualizado_en,
       sincronizado, eliminado)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    profesor.id,
    profesor.nombre,
    profesor.departamento,
    JSON.stringify(profesor.datos),
    profesor.actualizado_en,
    sincronizado
  );

  return profesor;
}

async function agregarPendiente(id, tipo, payload) {
  const database = await db();

  await database.runAsync(
    `INSERT INTO operaciones_pendientes
      (profesor_id, tipo, payload, creado_en)
     VALUES (?, ?, ?, ?)`,
    id,
    tipo,
    JSON.stringify(payload),
    new Date().toISOString()
  );
}

export async function listarProfesores() {
  const database = await db();

  const rows = await database.getAllAsync(
    `SELECT * FROM profesores
     WHERE eliminado = 0
     ORDER BY nombre COLLATE NOCASE`
  );

  return rows.map((row) => ({
    ...normalizar({
      ...row,
      datos: row.datos,
    }),
    sincronizado: row.sincronizado,
  }));
}

export async function guardarProfesor(p, idExistente = null) {
  const id = String(idExistente || p.id || crearId());

  const profesor = normalizar({
    ...p,
    id,
    actualizado_en: new Date().toISOString(),
  });

  await guardarProfesorLocal(profesor, 0);

  const database = await db();

  const pendientes = await database.getAllAsync(
    `SELECT tipo FROM operaciones_pendientes
     WHERE profesor_id = ?
     ORDER BY id`,
    id
  );

  const yaTieneCreacion = pendientes.some(
    (op) => op.tipo === "POST"
  );

  const tipo = idExistente || yaTieneCreacion ? "PUT" : "POST";

  await agregarPendiente(id, tipo, profesor);

  return profesor;
}

export async function eliminarProfesor(id) {
  const database = await db();

  const profesor = await database.getFirstAsync(
    `SELECT * FROM profesores WHERE id = ?`,
    String(id)
  );

  if (!profesor) return;

  const pendientes = await database.getAllAsync(
    `SELECT tipo FROM operaciones_pendientes
     WHERE profesor_id = ?
     ORDER BY id`,
    String(id)
  );

  const tieneCreacionPendiente = pendientes.some(
    (op) => op.tipo === "POST"
  );

  if (tieneCreacionPendiente) {
    // Si nunca llegó al servidor, no hace falta enviarlo ni borrarlo allí.
    await database.runAsync(
      `DELETE FROM operaciones_pendientes WHERE profesor_id = ?`,
      String(id)
    );

    await database.runAsync(
      `DELETE FROM profesores WHERE id = ?`,
      String(id)
    );

    return;
  }

  await database.runAsync(
    `UPDATE profesores SET eliminado = 1, sincronizado = 0 WHERE id = ?`,
    String(id)
  );

  await agregarPendiente(
    String(id),
    "DELETE",
    { id: String(id) }
  );
}

export async function obtenerPendientes() {
  const database = await db();

  return database.getAllAsync(
    `SELECT * FROM operaciones_pendientes ORDER BY id`
  );
}

export async function eliminarPendiente(id) {
  const database = await db();

  await database.runAsync(
    `DELETE FROM operaciones_pendientes WHERE id = ?`,
    id
  );
}

export async function marcarSincronizado(id, tipo) {
  const database = await db();

  if (tipo === "DELETE") {
    await database.runAsync(
      `DELETE FROM profesores WHERE id = ?`,
      String(id)
    );
  } else {
    await database.runAsync(
      `UPDATE profesores
       SET sincronizado = 1
       WHERE id = ?`,
      String(id)
    );
  }
}

export async function guardarProfesorRemoto(p) {
  const database = await db();
  const id = String(p.id);

  const local = await database.getFirstAsync(
    `SELECT sincronizado, eliminado FROM profesores WHERE id = ?`,
    id
  );

  // No sobrescribir cambios locales que aún no se han sincronizado.
  if (local && (local.sincronizado === 0 || local.eliminado === 1)) {
    return;
  }

  await guardarProfesorLocal(p, 1);
}

export async function obtenerProfesorLocal(id) {
  const database = await db();

  const row = await database.getFirstAsync(
    `SELECT * FROM profesores
     WHERE id = ? AND eliminado = 0`,
    String(id)
  );

  if (!row) return null;

  return {
    ...normalizar(row),
    sincronizado: row.sincronizado,
  };
}
