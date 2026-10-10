
const http = require('http');
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const swaggerJsDoc = require('swagger-jsdoc');

// =====================================================
// CONFIGURACIÓN DE SUPABASE
// =====================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error(
    'Faltan las variables SUPABASE_URL o SUPABASE_SECRET_KEY'
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

const TABLE = 'profesores';

// =====================================================
// DOCUMENTACIÓN SWAGGER
// =====================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     Profesor:
 *       type: object
 *       required:
 *         - nombre
 *         - departamento
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         nombre:
 *           type: string
 *         departamento:
 *           type: string
 *         formacion:
 *           type: object
 *           additionalProperties: true
 *         experiencia:
 *           type: array
 *           items:
 *             type: object
 *             additionalProperties: true
 *
 * /profesores:
 *   get:
 *     summary: Obtener todos los profesores
 *     responses:
 *       200:
 *         description: Lista de profesores
 *   post:
 *     summary: Crear un profesor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Profesor'
 *     responses:
 *       201:
 *         description: Profesor creado
 *
 * /profesores/{id}:
 *   put:
 *     summary: Actualizar un profesor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Profesor'
 *     responses:
 *       200:
 *         description: Profesor actualizado
 *       404:
 *         description: Profesor no encontrado
 *   delete:
 *     summary: Eliminar un profesor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Profesor eliminado
 *       404:
 *         description: Profesor no encontrado
 *
 * /search/{nombre}:
 *   get:
 *     summary: Buscar profesores por nombre
 *     parameters:
 *       - in: path
 *         name: nombre
 *         required: true
 *         schema:
 *           type: string
 *         example: Elfar
 *     responses:
 *       200:
 *         description: Resultados de búsqueda
 */

const swaggerSpec = swaggerJsDoc({
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Profesores API',
      version: '2.0.0',
      description: 'Microservicio CRUD de profesores con Supabase PostgreSQL'
    },
    servers: [
      {
        url: process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000'
      }
    ]
  },
  apis: [__filename]
});

const swaggerHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Profesores API Docs</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/swagger.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis]
    });
  </script>
</body>
</html>`;

// =====================================================
// UTILIDADES HTTP
// =====================================================

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(data));
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let tooLarge = false;

    req.on('data', chunk => {
      body += chunk.toString();

      if (Buffer.byteLength(body, 'utf8') > 1024 * 1024) {
        tooLarge = true;
        reject(new HttpError(413, 'El cuerpo de la solicitud es demasiado grande'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (tooLarge) return;

      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new HttpError(400, 'El cuerpo debe contener JSON válido'));
      }
    });

    req.on('error', reject);
  });
}

// Conserva los campos adicionales dentro de la columna JSONB "datos".
function prepareProfesor(body, existingDatos = {}) {
  const {
    id,
    nombre,
    departamento,
    datos,
    actualizado_en,
    estado_sincronizacion,
    ...otrosCampos
  } = body;

  if (typeof nombre !== 'string' || !nombre.trim()) {
    throw new HttpError(400, 'El nombre es obligatorio y debe ser texto');
  }

  if (typeof departamento !== 'string' || !departamento.trim()) {
    throw new HttpError(400, 'El departamento es obligatorio y debe ser texto');
  }

  if (datos !== undefined &&
      (datos === null || typeof datos !== 'object' || Array.isArray(datos))) {
    throw new HttpError(400, 'El campo datos debe ser un objeto JSON');
  }

  return {
    nombre: nombre.trim(),
    departamento: departamento.trim(),
    datos: {
      ...existingDatos,
      ...(datos || {}),
      ...otrosCampos
    },
    actualizado_en: new Date().toISOString()
  };
}

// Devuelve los campos JSONB junto con los campos principales.
function formatProfesor(row) {
  return {
    ...(row.datos || {}),
    id: row.id,
    nombre: row.nombre,
    departamento: row.departamento,
    actualizado_en: row.actualizado_en
  };
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// =====================================================
// SERVIDOR Y RUTAS
// =====================================================

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.writeHead(204).end();
  }

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost'}`
  );
  const pathname = decodeURIComponent(url.pathname);

  // Documentación
  if (pathname === '/api-docs' || pathname === '/api-docs/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(swaggerHtml);
  }

  if (pathname === '/swagger.json') {
    return sendJson(res, 200, swaggerSpec);
  }

  // Estado del servicio
  if (pathname === '/health' && req.method === 'GET') {
    return sendJson(res, 200, { status: 'ok' });
  }

  try {
    // Prueba real de acceso a Supabase
    if (pathname === '/test-supabase' && req.method === 'GET') {
      const { error } = await supabase
        .from(TABLE)
        .select('id')
        .limit(1);

      if (error) {
        console.error('Error de Supabase:', error.message);
        throw new HttpError(502, 'No se pudo consultar Supabase');
      }

      return sendJson(res, 200, {
        conectado: true,
        mensaje: 'Supabase responde correctamente'
      });
    }

    // GET /profesores
    if (pathname === '/profesores' && req.method === 'GET') {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;

      return sendJson(res, 200, data.map(formatProfesor));
    }

    // POST /profesores
    if (pathname === '/profesores' && req.method === 'POST') {
      const body = await getRequestBody(req);
      const profesor = prepareProfesor(body);

      // Aceptamos un UUID proporcionado por el cliente o generamos uno.
      const id = body.id === undefined ? randomUUID() : body.id;

      if (typeof id !== 'string' || !isValidUuid(id)) {
        throw new HttpError(400, 'El id debe ser un UUID válido');
      }

      const { data, error } = await supabase
        .from(TABLE)
        .insert({ id, ...profesor })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new HttpError(409, 'Ya existe un profesor con ese id');
        }
        throw error;
      }

      return sendJson(res, 201, {
        message: 'Profesor creado',
        profesor: formatProfesor(data)
      });
    }

    // GET /search/:nombre
    const searchMatch = pathname.match(/^\/search\/(.+)$/);

    if (searchMatch && req.method === 'GET') {
      const searchName = searchMatch[1].trim();

      if (!searchName) {
        throw new HttpError(400, 'Debes indicar un nombre para buscar');
      }

      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .ilike('nombre', `%${searchName}%`)
        .order('nombre', { ascending: true });

      if (error) throw error;

      return sendJson(res, 200, data.map(formatProfesor));
    }

    // PUT /profesores/:id
    const profesorMatch = pathname.match(/^\/profesores\/([^/]+)$/);

    if (profesorMatch && req.method === 'PUT') {
      const id = profesorMatch[1];

      if (!isValidUuid(id)) {
        throw new HttpError(400, 'El id debe ser un UUID válido');
      }

      const body = await getRequestBody(req);

      const { data: actual, error: selectError } = await supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (selectError) throw selectError;

      if (!actual) {
        throw new HttpError(404, 'Profesor no encontrado');
      }

      // Permite actualizar solo algunos campos sin perder los demás.
      const mergedBody = {
        ...actual.datos,
        ...body,
        nombre: body.nombre ?? actual.nombre,
        departamento: body.departamento ?? actual.departamento
      };

      const profesor = prepareProfesor(mergedBody, actual.datos);

      const { data, error } = await supabase
        .from(TABLE)
        .update(profesor)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      return sendJson(res, 200, {
        message: 'Profesor actualizado',
        profesor: formatProfesor(data)
      });
    }

    // DELETE /profesores/:id
    if (profesorMatch && req.method === 'DELETE') {
      const id = profesorMatch[1];

      if (!isValidUuid(id)) {
        throw new HttpError(400, 'El id debe ser un UUID válido');
      }

      const { data, error } = await supabase
        .from(TABLE)
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new HttpError(404, 'Profesor no encontrado');
      }

      return sendJson(res, 200, {
        message: 'Profesor eliminado',
        deletedCount: 1
      });
    }

    return sendJson(res, 404, { error: 'Ruta no encontrada' });

  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;

    if (status === 500) {
      console.error('Error interno:', err.message);
    }

    return sendJson(res, status, {
      error: status === 500
        ? 'Error interno del servidor'
        : err.message
    });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Profesores API escuchando en el puerto ${PORT}`);
});
