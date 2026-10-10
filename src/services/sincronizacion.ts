import NetInfo from "@react-native-community/netinfo";
import {
  crearId,
  eliminarPendiente,
  eliminarProfesor,
  eliminarProfesorLocalDefinitivo,
  guardarProfesor,
  guardarProfesorLocal,
  guardarProfesorRemoto,
  initDatabase,
  listarProfesores,
  marcarSincronizado,
  normalizar,
  obtenerPendientes,
  reconciliarProfesoresRemotos,
} from "../database/sqlite";

export const API_BASE_URL = "https://profesores-node-ueas.onrender.com";

/**
 * Realiza un fetch con tiempo de espera configurable para evitar bloqueos en conexiones lentas o caídas.
 */
async function fetchConTimeout(
  url: string,
  opciones: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const idTimeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const respuesta = await fetch(url, {
      ...opciones,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...opciones.headers,
      },
    });

    return respuesta;
  } finally {
    clearTimeout(idTimeout);
  }
}

/**
 * Comprueba si hay conexión a internet activa y verificable tanto en web como en móvil.
 */
export async function hayConexion(): Promise<boolean> {
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.onLine === "boolean"
    ) {
      if (!navigator.onLine) {
        return false;
      }
    }

    const state = await NetInfo.fetch();
    if (state.isConnected === false || state.isInternetReachable === false) {
      return false;
    }

    return true;
  } catch {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.onLine === "boolean"
    ) {
      return navigator.onLine;
    }
    return true;
  }
}

function extraerLista(resultado: any): any[] {
  if (Array.isArray(resultado)) return resultado;
  if (Array.isArray(resultado?.data)) return resultado.data;
  if (Array.isArray(resultado?.profesores)) return resultado.profesores;
  return [];
}

/**
 * Sincroniza todas las operaciones pendientes (POST, PUT, DELETE) con el microservicio.
 */
export async function sincronizarPendientes(): Promise<{
  totalSincronizados: number;
  errores: number;
}> {
  await initDatabase();

  const pendientes = await obtenerPendientes();
  let sincronizados = 0;
  let errores = 0;

  if (pendientes.length === 0) {
    return { totalSincronizados: 0, errores: 0 };
  }

  const online = await hayConexion();
  if (!online) {
    return { totalSincronizados: 0, errores: pendientes.length };
  }

  for (const operacion of pendientes) {
    try {
      const id = operacion.profesor_id;
      const payload = JSON.parse(operacion.payload);

      if (operacion.tipo === "POST") {
        const resp = await fetchConTimeout(`${API_BASE_URL}/profesores`, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (resp.status === 201 || resp.status === 200) {
          const creado = await resp.json().catch(() => payload);
          await guardarProfesorLocal(creado || payload, 1);
          await marcarSincronizado(id, "POST");
          await eliminarPendiente(operacion.id);
          sincronizados++;
        } else if (resp.status === 409) {
          // Si el ID ya existe en el servidor, intentamos actualizarlo
          const updateResp = await fetchConTimeout(
            `${API_BASE_URL}/profesores/${encodeURIComponent(id)}`,
            {
              method: "PUT",
              body: JSON.stringify(payload),
            }
          );

          if (updateResp.ok) {
            const actualizado = await updateResp.json().catch(() => payload);
            await guardarProfesorLocal(actualizado || payload, 1);
            await marcarSincronizado(id, "POST");
            await eliminarPendiente(operacion.id);
            sincronizados++;
          } else {
            errores++;
            break;
          }
        } else {
          errores++;
          break;
        }
      } else if (operacion.tipo === "PUT") {
        const resp = await fetchConTimeout(
          `${API_BASE_URL}/profesores/${encodeURIComponent(id)}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        if (resp.status === 200) {
          const actualizado = await resp.json().catch(() => payload);
          await guardarProfesorLocal(actualizado || payload, 1);
          await marcarSincronizado(id, "PUT");
          await eliminarPendiente(operacion.id);
          sincronizados++;
        } else if (resp.status === 404) {
          // Si no existe en el servidor, intentamos crearlo
          const postResp = await fetchConTimeout(
            `${API_BASE_URL}/profesores`,
            {
              method: "POST",
              body: JSON.stringify(payload),
            }
          );

          if (postResp.status === 201 || postResp.status === 200) {
            const creado = await postResp.json().catch(() => payload);
            await guardarProfesorLocal(creado || payload, 1);
            await marcarSincronizado(id, "PUT");
            await eliminarPendiente(operacion.id);
            sincronizados++;
          } else {
            errores++;
            break;
          }
        } else {
          errores++;
          break;
        }
      } else if (operacion.tipo === "DELETE") {
        const resp = await fetchConTimeout(
          `${API_BASE_URL}/profesores/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
          }
        );

        if (resp.status === 200 || resp.status === 404) {
          await eliminarProfesorLocalDefinitivo(id);
          await eliminarPendiente(operacion.id);
          sincronizados++;
        } else {
          errores++;
          break;
        }
      }
    } catch (err) {
      console.warn("Fallo en sincronización de operación pendiente:", err);
      errores++;
      break;
    }
  }

  return { totalSincronizados: sincronizados, errores };
}

/**
 * Consulta la lista de profesores.
 * Si hay internet:
 *  1. Sincroniza pendientes.
 *  2. Consume el microservicio en internet.
 *  3. Actualiza el almacenamiento local.
 *  4. Retorna la lista actualizada.
 * Si no hay internet o el servidor falla:
 *  Utiliza el almacenamiento local (SQLite/localStorage).
 */
export async function consultarProfesores(searchTerm = ""): Promise<{
  profesores: any[];
  isOnline: boolean;
  sincronizados: number;
}> {
  await initDatabase();
  const termino = searchTerm.trim().toLowerCase();
  const online = await hayConexion();

  if (online) {
    try {
      // 1. Sincronizar pendientes previos si los hay
      const { totalSincronizados } = await sincronizarPendientes();

      // 2. Consumir el microservicio
      const url = termino
        ? `${API_BASE_URL}/search/${encodeURIComponent(searchTerm.trim())}`
        : `${API_BASE_URL}/profesores`;

      const resp = await fetchConTimeout(url, { method: "GET" }, 8000);

      if (resp.ok) {
        const resultado = await resp.json();
        const listaRemota = extraerLista(resultado);

        if (!termino) {
          // Reconciliar toda la base local con el servidor
          await reconciliarProfesoresRemotos(listaRemota);
          const datosLocales = await listarProfesores();
          return {
            profesores: datosLocales,
            isOnline: true,
            sincronizados: totalSincronizados,
          };
        } else {
          // Para búsquedas: actualizar los remotos encontrados localmente
          for (const item of listaRemota) {
            await guardarProfesorRemoto(item);
          }

          const todosLocales = await listarProfesores();
          const localesFiltrados = todosLocales.filter((p: any) =>
            p.nombre?.toLowerCase().includes(termino)
          );

          return {
            profesores: localesFiltrados,
            isOnline: true,
            sincronizados: totalSincronizados,
          };
        }
      }
    } catch (error) {
      console.warn("Error consultando microservicio, recurriendo a base local:", error);
    }
  }

  // Fallback offline a almacenamiento local
  const locales = await listarProfesores();
  const filtrados = termino
    ? locales.filter((p: any) => p.nombre?.toLowerCase().includes(termino))
    : locales;

  return {
    profesores: filtrados,
    isOnline: false,
    sincronizados: 0,
  };
}

/**
 * Crear un profesor.
 * Si hay internet: consume POST del microservicio y guarda localmente (sincronizado = 1).
 * Si no hay internet: guarda localmente (sincronizado = 0) y agrega a operaciones pendientes.
 */
export async function crearProfesorService(datos: any): Promise<{
  profesor: any;
  isOnline: boolean;
  sincronizado: boolean;
}> {
  await initDatabase();

  const id = String(datos.id || crearId());
  const payload = normalizar({
    ...datos,
    id,
    actualizado_en: new Date().toISOString(),
  });

  const online = await hayConexion();

  if (online) {
    try {
      // Si no traía un ID previo del cliente, enviamos sin ID para que el microservicio
      // asigne su UUID canónico; si ya traía un ID válido, lo enviamos.
      const bodyEnvio = datos.id ? payload : { ...payload };

      const resp = await fetchConTimeout(`${API_BASE_URL}/profesores`, {
        method: "POST",
        body: JSON.stringify(bodyEnvio),
      });

      if (resp.status === 201 || resp.status === 200) {
        const servidor = await resp.json().catch(() => payload);
        const normalizadoServidor = normalizar({
          ...payload,
          ...servidor,
        });

        await guardarProfesorLocal(normalizadoServidor, 1);

        return {
          profesor: normalizadoServidor,
          isOnline: true,
          sincronizado: true,
        };
      } else {
        const errorData = await resp.json().catch(() => ({}));
        if (resp.status === 400 && errorData.error) {
          throw new Error(errorData.error);
        }
      }
    } catch (error: any) {
      if (error?.message && !error.message.includes("fetch")) {
        throw error;
      }
      console.warn("Fallo de red al crear profesor en microservicio:", error);
    }
  }

  // Modo offline o fallback por falla del servidor
  const guardadoLocal = await guardarProfesor(payload);

  return {
    profesor: guardadoLocal,
    isOnline: false,
    sincronizado: false,
  };
}

/**
 * Actualizar un profesor.
 * Si hay internet: consume PUT del microservicio y actualiza localmente (sincronizado = 1).
 * Si no hay internet: actualiza localmente (sincronizado = 0) y agrega a operaciones pendientes.
 */
export async function actualizarProfesorService(
  id: string,
  datos: any
): Promise<{
  profesor: any;
  isOnline: boolean;
  sincronizado: boolean;
}> {
  await initDatabase();

  const payload = normalizar({
    ...datos,
    id: String(id),
    actualizado_en: new Date().toISOString(),
  });

  const online = await hayConexion();

  if (online) {
    try {
      const resp = await fetchConTimeout(
        `${API_BASE_URL}/profesores/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );

      if (resp.status === 200) {
        const servidor = await resp.json().catch(() => payload);
        const normalizadoServidor = normalizar({
          ...payload,
          ...servidor,
        });

        await guardarProfesorLocal(normalizadoServidor, 1);

        return {
          profesor: normalizadoServidor,
          isOnline: true,
          sincronizado: true,
        };
      } else if (resp.status === 404) {
        // Si no existe con ese ID en el servidor, intentamos crearlo con POST
        const postResp = await fetchConTimeout(
          `${API_BASE_URL}/profesores`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );

        if (postResp.status === 201 || postResp.status === 200) {
          const servidor = await postResp.json().catch(() => payload);
          const normalizadoServidor = normalizar({
            ...payload,
            ...servidor,
          });

          await guardarProfesorLocal(normalizadoServidor, 1);

          return {
            profesor: normalizadoServidor,
            isOnline: true,
            sincronizado: true,
          };
        }
      }
    } catch (error) {
      console.warn("Fallo de red al actualizar profesor en microservicio:", error);
    }
  }

  // Modo offline o fallback por falla del servidor
  const guardadoLocal = await guardarProfesor(payload, id);

  return {
    profesor: guardadoLocal,
    isOnline: false,
    sincronizado: false,
  };
}

/**
 * Eliminar un profesor.
 * Si hay internet: consume DELETE del microservicio y elimina del almacenamiento local.
 * Si no hay internet: marca eliminado localmente y agrega operación DELETE pendiente.
 */
export async function eliminarProfesorService(id: string): Promise<{
  id: string;
  isOnline: boolean;
  sincronizado: boolean;
}> {
  await initDatabase();
  const idStr = String(id);
  const online = await hayConexion();

  if (online) {
    try {
      const resp = await fetchConTimeout(
        `${API_BASE_URL}/profesores/${encodeURIComponent(idStr)}`,
        {
          method: "DELETE",
        }
      );

      if (resp.status === 200 || resp.status === 404) {
        await eliminarProfesorLocalDefinitivo(idStr);
        return {
          id: idStr,
          isOnline: true,
          sincronizado: true,
        };
      }
    } catch (error) {
      console.warn("Fallo de red al eliminar profesor en microservicio:", error);
    }
  }

  // Modo offline o fallback por falla de red
  await eliminarProfesor(idStr);

  return {
    id: idStr,
    isOnline: false,
    sincronizado: false,
  };
}

/**
 * Buscar profesores en servidor o localmente.
 */
export async function buscarProfesoresRemoto(nombre: string): Promise<any[]> {
  const { profesores } = await consultarProfesores(nombre);
  return profesores;
}

/**
 * Escucha cambios de conectividad para sincronizar automáticamente en cuanto vuelva el internet.
 */
export function suscribirSincronizacionAutomatica(
  onSincronizado: (resultado: { totalSincronizados: number }) => void
): () => void {
  // Listener NetInfo para móvil y web
  const unsubscribeNetInfo = NetInfo.addEventListener(async (state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      try {
        const resultado = await sincronizarPendientes();
        if (resultado.totalSincronizados > 0) {
          onSincronizado(resultado);
        }
      } catch (e) {
        console.warn("Error en auto-sincronización NetInfo:", e);
      }
    }
  });

  // Listener para evento 'online' nativo en navegadores
  let handleOnlineWeb: (() => void) | null = null;
  if (typeof window !== "undefined" && window.addEventListener) {
    handleOnlineWeb = async () => {
      try {
        const resultado = await sincronizarPendientes();
        if (resultado.totalSincronizados > 0) {
          onSincronizado(resultado);
        }
      } catch (e) {
        console.warn("Error en auto-sincronización Web:", e);
      }
    };
    window.addEventListener("online", handleOnlineWeb);
  }

  return () => {
    if (typeof unsubscribeNetInfo === "function") {
      unsubscribeNetInfo();
    }
    if (handleOnlineWeb && typeof window !== "undefined") {
      window.removeEventListener("online", handleOnlineWeb);
    }
  };
}
