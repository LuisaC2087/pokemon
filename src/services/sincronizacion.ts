
import {
  eliminarPendiente,
  guardarProfesorRemoto,
  listarProfesores,
  marcarSincronizado,
  obtenerPendientes,
} from "../database/sqlite";

const API = "https://profesores-node-ueas.onrender.com";

async function pedir(url: string, opciones: RequestInit = {}) {
  const respuesta = await fetch(url, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      ...opciones.headers,
    },
  });

  if (!respuesta.ok) {
    throw new Error(`Error del servidor: ${respuesta.status}`);
  }

  return respuesta;
}

function extraerLista(resultado: any) {
  if (Array.isArray(resultado)) return resultado;
  if (Array.isArray(resultado?.data)) return resultado.data;
  if (Array.isArray(resultado?.profesores)) return resultado.profesores;
  return [];
}

export async function consultarProfesores() {
  try {
    const respuesta = await pedir(`${API}/profesores`);
    const resultado = await respuesta.json();
    const profesores = extraerLista(resultado);

    for (const profesor of profesores) {
      if (profesor.id) {
        await guardarProfesorRemoto(profesor);
      }
    }

    // Devuelve los datos locales para conservar los cambios pendientes.
    return await listarProfesores();
  } catch {
    // Si el servidor falla, se consulta SQLite.
    return await listarProfesores();
  }
}

export async function sincronizarPendientes() {
  const pendientes = await obtenerPendientes();
  let completadas = 0;

  for (const operacion of pendientes) {
    try {
      const payload = JSON.parse(operacion.payload);
      const id = encodeURIComponent(operacion.profesor_id);

      if (operacion.tipo === "POST") {
        await pedir(`${API}/profesores`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else if (operacion.tipo === "PUT") {
        await pedir(`${API}/profesores/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else if (operacion.tipo === "DELETE") {
        const respuesta = await fetch(`${API}/profesores/${id}`, {
          method: "DELETE",
        });

        // Si ya no existe en el servidor, consideramos cumplida la eliminación.
        if (!respuesta.ok && respuesta.status !== 404) {
          throw new Error(`Error al eliminar: ${respuesta.status}`);
        }
      } else {
        // No borrar una operación cuyo tipo no conocemos.
        continue;
      }

      await marcarSincronizado(
        operacion.profesor_id,
        operacion.tipo
      );

      await eliminarPendiente(operacion.id);
      completadas++;
    } catch {
      // Conserva esta operación y las siguientes para otro intento.
      break;
    }
  }

  return completadas;
}

export async function buscarProfesoresRemoto(nombre: string) {
  try {
    const respuesta = await pedir(
      `${API}/search/${encodeURIComponent(nombre)}`
    );

    const resultado = await respuesta.json();
    return extraerLista(resultado);
  } catch {
    const locales = await listarProfesores();
    const termino = nombre.toLocaleLowerCase();

    return locales.filter((p: any) =>
      String(p.nombre || "").toLocaleLowerCase().includes(termino)
    );
  }
}
