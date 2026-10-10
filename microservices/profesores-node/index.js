const http = require('http');
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
const TABLE = 'profesores';
const PORT = process.env.PORT || 3000;
const MAX_BODY = 1_000_000;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY');
}

const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

/* ------------------------------------------------------------------ */
/*  Documentación OpenAPI (Swagger)                                    */
/*  - JSON:  GET /openapi.json                                         */
/*  - UI:    GET /docs                                                 */
/* ------------------------------------------------------------------ */

const ref = name => ({ $ref: `#/components/schemas/${name}` });
const errorResponse = description => ({
  description,
  content: { 'application/json': { schema: ref('Error') } }
});
const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'UUID del profesor',
  schema: { type: 'string', format: 'uuid' }
};

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Profesores API',
    version: '1.0.0',
    description:
      'API REST para gestionar profesores sobre Supabase.\n\n' +
      'Los campos adicionales enviados en el cuerpo (distintos de `id`, `nombre`, ' +
      '`departamento`, `datos` y `actualizado_en`) se guardan dentro de `datos` ' +
      'y se devuelven en el nivel raíz del objeto.'
  },
  servers: [{ url: '/', description: 'Servidor actual' }],
  tags: [
    { name: 'Profesores', description: 'Operaciones CRUD y búsqueda' },
    { name: 'Sistema', description: 'Estado del servicio' }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Estado del servicio',
        responses: {
          200: {
            description: 'Servicio activo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', example: 'ok' } }
                }
              }
            }
          }
        }
      }
    },
    '/test-supabase': {
      get: {
        tags: ['Sistema'],
        summary: 'Verifica la conexión con Supabase',
        responses: {
          200: {
            description: 'Conexión exitosa',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { conectado: { type: 'boolean', example: true } }
                }
              }
            }
          },
          500: errorResponse('Error de conexión con la base de datos')
        }
      }
    },
    '/profesores': {
      get: {
        tags: ['Profesores'],
        summary: 'Lista todos los profesores (ordenados por nombre)',
        responses: {
          200: {
            description: 'Lista de profesores',
            content: {
              'application/json': {
                schema: { type: 'array', items: ref('Profesor') }
              }
            }
          },
          500: errorResponse('Error del servidor')
        }
      },
      post: {
        tags: ['Profesores'],
        summary: 'Crea un profesor',
        description: 'Si no se envía `id`, se genera un UUID automáticamente.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: ref('ProfesorInput') } }
        },
        responses: {
          201: {
            description: 'Profesor creado',
            content: { 'application/json': { schema: ref('Profesor') } }
          },
          400: errorResponse('Datos inválidos o JSON mal formado'),
          409: errorResponse('El ID ya existe'),
          413: errorResponse('Solicitud demasiado grande'),
          500: errorResponse('Error del servidor')
        }
      }
    },
    '/profesores/{id}': {
      put: {
        tags: ['Profesores'],
        summary: 'Actualiza un profesor',
        description:
          'Actualización parcial: los campos omitidos conservan su valor actual. ' +
          'Los datos extra se fusionan con los existentes en `datos`.',
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: ref('ProfesorUpdate') } }
        },
        responses: {
          200: {
            description: 'Profesor actualizado',
            content: { 'application/json': { schema: ref('Profesor') } }
          },
          400: errorResponse('ID o datos inválidos'),
          404: errorResponse('Profesor no encontrado'),
          413: errorResponse('Solicitud demasiado grande'),
          500: errorResponse('Error del servidor')
        }
      },
      delete: {
        tags: ['Profesores'],
        summary: 'Elimina un profesor',
        parameters: [idParam],
        responses: {
          200: {
            description: 'Profesor eliminado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensaje: { type: 'string', example: 'Profesor eliminado' },
                    id: { type: 'string', format: 'uuid' }
                  }
                }
              }
            }
          },
          400: errorResponse('ID inválido'),
          404: errorResponse('Profesor no encontrado'),
          500: errorResponse('Error del servidor')
        }
      }
    },
    '/search/{nombre}': {
      get: {
        tags: ['Profesores'],
        summary: 'Busca profesores por nombre (coincidencia parcial, sin distinguir mayúsculas)',
        parameters: [
          {
            name: 'nombre',
            in: 'path',
            required: true,
            description: 'Texto a buscar dentro del nombre',
            schema: { type: 'string', example: 'maria' }
          }
        ],
        responses: {
          200: {
            description: 'Profesores que coinciden (puede ser una lista vacía)',
            content: {
              'application/json': {
                schema: { type: 'array', items: ref('Profesor') }
              }
            }
          },
          400: errorResponse('Nombre vacío o mal codificado'),
          500: errorResponse('Error del servidor')
        }
      }
    }
  },
  components: {
    schemas: {
      Profesor: {
        type: 'object',
        additionalProperties: true,
        required: ['id', 'nombre', 'departamento'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          nombre: { type: 'string', example: 'María Gómez' },
          departamento: { type: 'string', example: 'Matemáticas' },
          actualizado_en: { type: 'string', format: 'date-time' }
        },
        example: {
          id: '3f2b8c1e-5d4a-4e6b-9a7c-1b2c3d4e5f60',
          nombre: 'María Gómez',
          departamento: 'Matemáticas',
          correo: 'maria@colegio.edu',
          actualizado_en: '2026-10-10T17:06:00.000Z'
        }
      },
      ProfesorInput: {
        type: 'object',
        additionalProperties: true,
        required: ['nombre', 'departamento'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Opcional. Se genera si se omite.'
          },
          nombre: { type: 'string', example: 'María Gómez' },
          departamento: { type: 'string', example: 'Matemáticas' },
          datos: {
            type: 'object',
            additionalProperties: true,
            description: 'Información adicional libre'
          }
        },
        example: {
          nombre: 'María Gómez',
          departamento: 'Matemáticas',
          correo: 'maria@colegio.edu'
        }
      },
      ProfesorUpdate: {
        type: 'object',
        additionalProperties: true,
        properties: {
          nombre: { type: 'string' },
          departamento: { type: 'string' },
          datos: { type: 'object', additionalProperties: true }
        },
        example: { departamento: 'Física', telefono: '3001234567' }
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string', example: 'Profesor no encontrado' },
          codigo: {
            type: 'string',
            description: 'Código interno o de la base de datos (si aplica)',
            example: 'NOT_FOUND'
          }
        }
      }
    }
  }
};

const docsHtml = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Profesores API - Documentación</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true
      });
    };
  </script>
</body>
</html>`;

/* ------------------------------------------------------------------ */
/*  Utilidades                                                         */
/* ------------------------------------------------------------------ */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const send = (res, status, data) => {
  if (res.headersSent) return;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...CORS
  });
  res.end(JSON.stringify(data));
};

const sendHtml = (res, status, html) => {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...CORS });
  res.end(html);
};

// Error controlado de la aplicación
class ApiError extends Error {
  constructor(message, status = 400, codigo) {
    super(message);
    this.status = status;
    this.codigo = codigo;
  }
}

const fail = (message, status = 400, codigo) =>
  new ApiError(message, status, codigo);

// Códigos de error de Postgres / PostgREST -> HTTP
const DB_ERRORS = {
  '23505': [409, 'Ya existe un registro con ese valor único'],
  '23502': [400, 'Falta un campo obligatorio'],
  '23503': [409, 'Violación de llave foránea'],
  '23514': [400, 'Un valor no cumple las restricciones'],
  '22P02': [400, 'Formato de dato inválido'],
  '22001': [400, 'Un valor excede la longitud permitida'],
  PGRST116: [404, 'Recurso no encontrado'],
  PGRST301: [401, 'Credenciales inválidas o expiradas'],
  '42501': [403, 'Permisos insuficientes en la base de datos'],
  '42P01': [500, 'Tabla no encontrada en la base de datos']
};

// Convierte cualquier error en { status, error, codigo }
function normalizeError(error) {
  if (error instanceof ApiError) {
    return { status: error.status, error: error.message, codigo: error.codigo };
  }

  const mapped = error && DB_ERRORS[error.code];
  if (mapped) {
    return { status: mapped[0], error: mapped[1], codigo: error.code };
  }

  // Fallo de red / fetch hacia Supabase
  if (error && (error.name === 'TypeError' || /fetch failed/i.test(error.message || ''))) {
    return {
      status: 503,
      error: 'No se pudo conectar con la base de datos',
      codigo: 'DB_UNAVAILABLE'
    };
  }

  // No exponer detalles internos en errores inesperados
  return {
    status: 500,
    error: 'Error interno del servidor',
    codigo: (error && error.code) || 'INTERNAL_ERROR'
  };
}

// Lanza el error si Supabase devolvió uno
const check = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const isPlainObject = v =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let done = false;

    const finish = (fn, value) => {
      if (done) return;
      done = true;
      fn(value);
    };

    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        finish(reject, fail('Solicitud demasiado grande', 413, 'PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      let parsed;
      try {
        parsed = JSON.parse(text || '{}');
      } catch {
        return finish(reject, fail('JSON inválido', 400, 'INVALID_JSON'));
      }
      if (!isPlainObject(parsed)) {
        return finish(
          reject,
          fail('El cuerpo debe ser un objeto JSON', 400, 'INVALID_BODY')
        );
      }
      finish(resolve, parsed);
    });

    req.on('error', err => finish(reject, err));
  });
}

const validId = id =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

function prepare(body, current = {}) {
  if (body.nombre !== undefined && typeof body.nombre !== 'string') {
    throw fail('El campo nombre debe ser texto', 400, 'VALIDATION_ERROR');
  }
  if (body.departamento !== undefined && typeof body.departamento !== 'string') {
    throw fail('El campo departamento debe ser texto', 400, 'VALIDATION_ERROR');
  }
  if (body.datos !== undefined && !isPlainObject(body.datos)) {
    throw fail('El campo datos debe ser un objeto', 400, 'VALIDATION_ERROR');
  }

  const nombre = body.nombre ?? current.nombre;
  const departamento = body.departamento ?? current.departamento;

  if (typeof nombre !== 'string' || !nombre.trim() ||
      typeof departamento !== 'string' || !departamento.trim()) {
    throw fail('Nombre y departamento son obligatorios', 400, 'VALIDATION_ERROR');
  }

  const reserved = ['id', 'nombre', 'departamento', 'datos', 'actualizado_en'];

  const extras = Object.fromEntries(
    Object.entries(body).filter(([key]) => !reserved.includes(key))
  );

  return {
    nombre: nombre.trim(),
    departamento: departamento.trim(),
    datos: {
      ...(current.datos || {}),
      ...(body.datos || {}),
      ...extras
    },
    actualizado_en: new Date().toISOString()
  };
}

const format = row => ({
  ...(row.datos || {}),
  id: row.id,
  nombre: row.nombre,
  departamento: row.departamento,
  actualizado_en: row.actualizado_en
});

// Escapa comodines de ILIKE para que se busquen como texto literal
const escapeLike = s => s.replace(/[\\%_]/g, '\\$&');

/* ------------------------------------------------------------------ */
/*  Manejador principal                                                */
/* ------------------------------------------------------------------ */

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    // Quita barra final (excepto la raíz)
    const path = url.pathname.length > 1
      ? url.pathname.replace(/\/+$/, '')
      : url.pathname;

    // ---- Documentación ----
    if (req.method === 'GET' && (path === '/docs' || path === '/')) {
      return sendHtml(res, 200, docsHtml);
    }

    if (req.method === 'GET' && path === '/openapi.json') {
      return send(res, 200, openapi);
    }

    // ---- Sistema ----
    if (req.method === 'GET' && path === '/health') {
      return send(res, 200, { status: 'ok' });
    }

    if (req.method === 'GET' && path === '/test-supabase') {
      check(await db.from(TABLE).select('id').limit(1));
      return send(res, 200, { conectado: true });
    }

    // ---- Colección ----
    if (path === '/profesores') {
      if (req.method === 'GET') {
        const data = check(await db.from(TABLE).select('*').order('nombre'));
        return send(res, 200, data.map(format));
      }

      if (req.method === 'POST') {
        const body = await readBody(req);
        const id = body.id ?? randomUUID();

        if (!validId(id)) throw fail('ID UUID inválido', 400, 'INVALID_ID');

        const data = check(
          await db
            .from(TABLE)
            .insert({ id, ...prepare(body) })
            .select('*')
            .single()
        );
        return send(res, 201, format(data));
      }

      throw fail('Método no permitido', 405, 'METHOD_NOT_ALLOWED');
    }

    // ---- Búsqueda ----
    const search = path.match(/^\/search\/(.+)$/);

    if (search) {
      if (req.method !== 'GET') {
        throw fail('Método no permitido', 405, 'METHOD_NOT_ALLOWED');
      }

      let nombre;
      try {
        nombre = decodeURIComponent(search[1]).trim();
      } catch {
        throw fail('Nombre mal codificado en la URL', 400, 'INVALID_URL');
      }
      if (!nombre) throw fail('Indica un nombre', 400, 'VALIDATION_ERROR');

      const data = check(
        await db
          .from(TABLE)
          .select('*')
          .ilike('nombre', `%${escapeLike(nombre)}%`)
      );
      return send(res, 200, data.map(format));
    }

    // ---- Recurso individual ----
    const match = path.match(/^\/profesores\/([^/]+)$/);

    if (match) {
      if (!['PUT', 'DELETE'].includes(req.method)) {
        throw fail('Método no permitido', 405, 'METHOD_NOT_ALLOWED');
      }

      const id = match[1];
      if (!validId(id)) throw fail('ID UUID inválido', 400, 'INVALID_ID');

      if (req.method === 'DELETE') {
        const data = check(
          await db
            .from(TABLE)
            .delete()
            .eq('id', id)
            .select('id')
            .maybeSingle()
        );
        if (!data) throw fail('Profesor no encontrado', 404, 'NOT_FOUND');

        return send(res, 200, { mensaje: 'Profesor eliminado', id });
      }

      const body = await readBody(req);

      const current = check(
        await db.from(TABLE).select('*').eq('id', id).maybeSingle()
      );
      if (!current) throw fail('Profesor no encontrado', 404, 'NOT_FOUND');

      const data = check(
        await db
          .from(TABLE)
          .update(prepare(body, current))
          .eq('id', id)
          .select('*')
          .single()
      );
      return send(res, 200, format(data));
    }

    throw fail('Ruta no encontrada', 404, 'ROUTE_NOT_FOUND');

  } catch (error) {
    const { status, error: message, codigo } = normalizeError(error);

    if (status >= 500) {
      console.error('Error API:', error);
    } else {
      console.warn(`Aviso API [${status}]:`, message);
    }

    return send(res, status, { error: message, codigo });
  }
}

/* ------------------------------------------------------------------ */
/*  Servidor y errores globales                                        */
/* ------------------------------------------------------------------ */

const server = http.createServer((req, res) => {
  handle(req, res).catch(err => {
    console.error('Error no controlado:', err);
    send(res, 500, { error: 'Error interno del servidor', codigo: 'INTERNAL_ERROR' });
  });
});

server.on('clientError', (err, socket) => {
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

server.listen(PORT, () => {
  console.log(`Profesores API funcionando en el puerto ${PORT}`);
  console.log(`Documentación Swagger: http://localhost:${PORT}/docs`);
});

process.on('unhandledRejection', reason => {
  console.error('Promesa rechazada sin manejar:', reason);
});

process.on('uncaughtException', err => {
  console.error('Excepción no capturada:', err);
  server.close(() => process.exit(1));
  setTimeout(() => process.exit(1), 5000).unref();
});

const shutdown = signal => {
  console.log(`${signal} recibido, cerrando servidor...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));