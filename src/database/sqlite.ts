import { Platform } from "react-native";
import * as Crypto from "expo-crypto";

let SQLite: any = null;
if (Platform.OS !== "web") {
  try {
    SQLite = require("expo-sqlite");
  } catch {
    SQLite = null;
  }
}

let databasePromise: Promise<any> | null = null;
let useWebFallback = Platform.OS === "web";

// Constantes para almacenamiento en Web / Fallback
const STORAGE_PROFESORES_KEY = "pokemon_app_profesores_v1";
const STORAGE_PENDIENTES_KEY = "pokemon_app_operaciones_pendientes_v1";

// Memoria en caso de que localStorage no esté disponible
let memoryProfesores: any[] = [];
let memoryPendientes: any[] = [];

function getWebStorage(key: string): any[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const data = window.localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    }
  } catch {
    // ignorar
  }
  return key === STORAGE_PROFESORES_KEY ? memoryProfesores : memoryPendientes;
}

function setWebStorage(key: string, data: any[]): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(data));
      return;
    }
  } catch {
    // ignorar
  }
  if (key === STORAGE_PROFESORES_KEY) {
    memoryProfesores = data;
  } else {
    memoryPendientes = data;
  }
}

export function crearId(): string {
  try {
    if (Crypto?.randomUUID) {
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

export async function getDb(): Promise<any> {
  if (useWebFallback || !SQLite) {
    return null;
  }

  if (!databasePromise) {
    databasePromise = (async () => {
      try {
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
      } catch (err) {
        console.warn("No se pudo iniciar SQLite nativo, activando modo almacenamiento web/local:", err);
        useWebFallback = true;
        return null;
      }
    })();
  }

  return databasePromise;
}

export async function initDatabase(): Promise<void> {
  if (Platform.OS === "web") {
    useWebFallback = true;
    return;
  }
  try {
    await getDb();
  } catch {
    useWebFallback = true;
  }
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
 * Guarda un profesor localmente (en SQLite si es nativo o localStorage si es web).
 */
export async function guardarProfesorLocal(
  p: any,
  sincronizado = 0
): Promise<any> {
  const profesor = normalizar({ ...p, sincronizado });

  if (useWebFallback) {
    const lista = getWebStorage(STORAGE_PROFESORES_KEY);
    const index = lista.findIndex((item) => String(item.id) === String(profesor.id));
    if (index >= 0) {
      lista[index] = profesor;
    } else {
      lista.push(profesor);
    }
    setWebStorage(STORAGE_PROFESORES_KEY, lista);
    return profesor;
  }

  const database = await getDb();
  if (!database) {
    return guardarProfesorLocal(p, sincronizado);
  }

  const { id, nombre, departamento, actualizado_en, eliminado } = profesor;
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
  if (useWebFallback) {
    const pendientes = getWebStorage(STORAGE_PENDIENTES_KEY);
    const nuevaOp = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      profesor_id: String(id),
      tipo,
      payload: JSON.stringify(payload),
      creado_en: new Date().toISOString(),
    };
    pendientes.push(nuevaOp);
    setWebStorage(STORAGE_PENDIENTES_KEY, pendientes);
    return;
  }

  const database = await getDb();
  if (!database) {
    return agregarPendiente(id, tipo, payload);
  }

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
  if (useWebFallback) {
    const lista = getWebStorage(STORAGE_PROFESORES_KEY);
    return lista
      .filter((p) => Number(p.eliminado || 0) === 0)
      .map((p) => normalizar(p))
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  }

  const database = await getDb();
  if (!database) {
    return listarProfesores();
  }

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
  const id = String(idExistente || p.id || crearId());
  const profesor = normalizar({
    ...p,
    id,
    actualizado_en: new Date().toISOString(),
  });

  await guardarProfesorLocal(profesor, 0);

  if (useWebFallback) {
    const pendientes = getWebStorage(STORAGE_PENDIENTES_KEY);
    const opPostIndex = pendientes.findIndex(
      (op) => String(op.profesor_id) === id && op.tipo === "POST"
    );

    if (opPostIndex >= 0) {
      pendientes[opPostIndex].payload = JSON.stringify(profesor);
      pendientes[opPostIndex].creado_en = new Date().toISOString();
      setWebStorage(STORAGE_PENDIENTES_KEY, pendientes);
    } else {
      const lista = getWebStorage(STORAGE_PROFESORES_KEY);
      const existe = lista.some((item) => String(item.id) === id);
      const opPutIndex = pendientes.findIndex(
        (op) => String(op.profesor_id) === id && op.tipo === "PUT"
      );

      if (opPutIndex >= 0) {
        pendientes[opPutIndex].payload = JSON.stringify(profesor);
        pendientes[opPutIndex].creado_en = new Date().toISOString();
        setWebStorage(STORAGE_PENDIENTES_KEY, pendientes);
      } else {
        const tipo = idExistente || (p.id && existe) ? "PUT" : "POST";
        await agregarPendiente(id, tipo, profesor);
      }
    }

    return profesor;
  }

  const database = await getDb();
  if (!database) {
    return guardarProfesor(p, idExistente);
  }

  const pendientes: any[] = await database.getAllAsync(
    `SELECT id, tipo FROM operaciones_pendientes
     WHERE profesor_id = ?
     ORDER BY id`,
    id
  );

  const operacionPost = pendientes.find((op) => op.tipo === "POST");

  if (operacionPost) {
    await database.runAsync(
      `UPDATE operaciones_pendientes
       SET payload = ?, creado_en = ?
       WHERE id = ?`,
      JSON.stringify(profesor),
      new Date().toISOString(),
      operacionPost.id
    );
  } else {
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
  const idStr = String(id);

  if (useWebFallback) {
    const pendientes = getWebStorage(STORAGE_PENDIENTES_KEY);
    const tieneCreacionPendiente = pendientes.some(
      (op) => String(op.profesor_id) === idStr && op.tipo === "POST"
    );

    if (tieneCreacionPendiente) {
      const nuevosPendientes = pendientes.filter(
        (op) => String(op.profesor_id) !== idStr
      );
      setWebStorage(STORAGE_PENDIENTES_KEY, nuevosPendientes);

      const lista = getWebStorage(STORAGE_PROFESORES_KEY).filter(
        (item) => String(item.id) !== idStr
      );
      setWebStorage(STORAGE_PROFESORES_KEY, lista);
      return;
    }

    // Limpiar anteriores operaciones pendientes de este profesor
    const filtrados = pendientes.filter((op) => String(op.profesor_id) !== idStr);
    setWebStorage(STORAGE_PENDIENTES_KEY, filtrados);

    // Marcar como eliminado en lista local
    const lista = getWebStorage(STORAGE_PROFESORES_KEY);
    const target = lista.find((item) => String(item.id) === idStr);
    if (target) {
      target.eliminado = 1;
      target.sincronizado = 0;
      setWebStorage(STORAGE_PROFESORES_KEY, lista);
    }

    await agregarPendiente(idStr, "DELETE", { id: idStr });
    return;
  }

  const database = await getDb();
  if (!database) {
    return eliminarProfesor(id);
  }

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

  await database.runAsync(
    `DELETE FROM operaciones_pendientes WHERE profesor_id = ?`,
    idStr
  );

  await database.runAsync(
    `UPDATE profesores SET eliminado = 1, sincronizado = 0 WHERE id = ?`,
    idStr
  );

  await agregarPendiente(idStr, "DELETE", { id: idStr });
}

/**
 * Elimina permanentemente de almacenamiento local (usado cuando la eliminación remota fue exitosa).
 */
export async function eliminarProfesorLocalDefinitivo(
  id: string
): Promise<void> {
  const idStr = String(id);

  if (useWebFallback) {
    const pendientes = getWebStorage(STORAGE_PENDIENTES_KEY).filter(
      (op) => String(op.profesor_id) !== idStr
    );
    setWebStorage(STORAGE_PENDIENTES_KEY, pendientes);

    const lista = getWebStorage(STORAGE_PROFESORES_KEY).filter(
      (item) => String(item.id) !== idStr
    );
    setWebStorage(STORAGE_PROFESORES_KEY, lista);
    return;
  }

  const database = await getDb();
  if (!database) {
    return eliminarProfesorLocalDefinitivo(id);
  }

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
  if (useWebFallback) {
    return getWebStorage(STORAGE_PENDIENTES_KEY);
  }

  const database = await getDb();
  if (!database) {
    return obtenerPendientes();
  }

  return database.getAllAsync(
    `SELECT * FROM operaciones_pendientes ORDER BY id`
  );
}

export async function contarPendientes(): Promise<number> {
  if (useWebFallback) {
    return getWebStorage(STORAGE_PENDIENTES_KEY).length;
  }

  const database = await getDb();
  if (!database) {
    return contarPendientes();
  }

  const res: any = await database.getFirstAsync(
    `SELECT COUNT(*) as total FROM operaciones_pendientes`
  );

  return res ? Number(res.total) : 0;
}

export async function eliminarPendiente(id: number | string): Promise<void> {
  if (useWebFallback) {
    const pendientes = getWebStorage(STORAGE_PENDIENTES_KEY).filter(
      (op) => String(op.id) !== String(id)
    );
    setWebStorage(STORAGE_PENDIENTES_KEY, pendientes);
    return;
  }

  const database = await getDb();
  if (!database) {
    return eliminarPendiente(id);
  }

  await database.runAsync(
    `DELETE FROM operaciones_pendientes WHERE id = ?`,
    id
  );
}

export async function marcarSincronizado(
  id: string,
  tipo: string
): Promise<void> {
  const idStr = String(id);

  if (useWebFallback) {
    if (tipo === "DELETE") {
      await eliminarProfesorLocalDefinitivo(idStr);
    } else {
      const lista = getWebStorage(STORAGE_PROFESORES_KEY);
      const target = lista.find((item) => String(item.id) === idStr);
      if (target) {
        target.sincronizado = 1;
        target.eliminado = 0;
        setWebStorage(STORAGE_PROFESORES_KEY, lista);
      }
    }
    return;
  }

  const database = await getDb();
  if (!database) {
    return marcarSincronizado(id, tipo);
  }

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
 * Guarda un profesor remoto en SQLite/local evitando sobreescribir cambios locales pendientes.
 */
export async function guardarProfesorRemoto(p: any): Promise<void> {
  const id = String(p.id);

  if (useWebFallback) {
    const lista = getWebStorage(STORAGE_PROFESORES_KEY);
    const local = lista.find((item) => String(item.id) === id);
    if (local && (Number(local.sincronizado) === 0 || Number(local.eliminado) === 1)) {
      return;
    }
    await guardarProfesorLocal(p, 1);
    return;
  }

  const database = await getDb();
  if (!database) {
    return guardarProfesorRemoto(p);
  }

  const local: any = await database.getFirstAsync(
    `SELECT sincronizado, eliminado FROM profesores WHERE id = ?`,
    id
  );

  if (local && (local.sincronizado === 0 || local.eliminado === 1)) {
    return;
  }

  await guardarProfesorLocal(p, 1);
}

/**
 * Reconcilia la lista remota recibida con la base local.
 */
export async function reconciliarProfesoresRemotos(
  remotos: any[]
): Promise<void> {
  const idsRemotos = new Set<string>();

  for (const p of remotos) {
    if (p && p.id) {
      idsRemotos.add(String(p.id));
      await guardarProfesorRemoto(p);
    }
  }

  if (useWebFallback) {
    const lista = getWebStorage(STORAGE_PROFESORES_KEY);
    const filtrados = lista.filter((loc) => {
      // Conservar si es un cambio local no sincronizado o si aún existe en el servidor
      if (Number(loc.sincronizado) === 0) return true;
      return idsRemotos.has(String(loc.id));
    });
    setWebStorage(STORAGE_PROFESORES_KEY, filtrados);
    return;
  }

  const database = await getDb();
  if (!database) {
    return reconciliarProfesoresRemotos(remotos);
  }

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
  const idStr = String(id);

  if (useWebFallback) {
    const lista = getWebStorage(STORAGE_PROFESORES_KEY);
    const row = lista.find(
      (p) => String(p.id) === idStr && Number(p.eliminado || 0) === 0
    );
    return row ? normalizar(row) : null;
  }

  const database = await getDb();
  if (!database) {
    return obtenerProfesorLocal(id);
  }

  const row = await database.getFirstAsync(
    `SELECT * FROM profesores
     WHERE id = ? AND eliminado = 0`,
    idStr
  );

  if (!row) return null;

  return normalizar(row);
}

export const obtenerProfesor = obtenerProfesorLocal;
