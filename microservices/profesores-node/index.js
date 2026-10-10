const http = require('http');
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
const TABLE = 'profesores';

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY');
}

const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

/* ---------- Swagger: /docs y /openapi.json ---------- */

const err = d => ({ description: d, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });
const ok = (d, schema) => ({ description: d, content: { 'application/json': { schema } } });
const profesor = { $ref: '#/components/schemas/Profesor' };
const body = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Profesor' } } } };
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };

const openapi = {
  openapi: '3.0.3',
  info: { title: 'Profesores API', version: '1.0.0' },
  paths: {
    '/health': { get: { summary: 'Estado del servicio', responses: { 200: ok('OK', { type: 'object' }) } } },
    '/test-supabase': { get: { summary: 'Probar conexión a Supabase', responses: { 200: ok('Conectado', { type: 'object' }), 500: err('Error') } } },
    '/profesores': {
      get: { summary: 'Listar profesores', responses: { 200: ok('Lista', { type: 'array', items: profesor }), 500: err('Error') } },
      post: { summary: 'Crear profesor', requestBody: body, responses: { 201: ok('Creado', profesor), 400: err('Datos inválidos'), 409: err('ID duplicado') } }
    },
    '/profesores/{id}': {
      put: { summary: 'Actualizar profesor', parameters: [idParam], requestBody: body, responses: { 200: ok('Actualizado', profesor), 400: err('Datos inválidos'), 404: err('No encontrado') } },
      delete: { summary: 'Eliminar profesor', parameters: [idParam], responses: { 200: ok('Eliminado', { type: 'object' }), 400: err('ID inválido'), 404: err('No encontrado') } }
    },
    '/search/{nombre}': {
      get: { summary: 'Buscar por nombre', parameters: [{ name: 'nombre', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: ok('Resultados', { type: 'array', items: profesor }), 400: err('Nombre vacío') } }
    }
  },
  components: {
    schemas: {
      Profesor: {
        type: 'object',
        required: ['nombre', 'departamento'],
        additionalProperties: true,
        properties: {
          id: { type: 'string', format: 'uuid' },
          nombre: { type: 'string', example: 'María Gómez' },
          departamento: { type: 'string', example: 'Matemáticas' }
        }
      },
      Error: { type: 'object', properties: { error: { type: 'string' }, codigo: { type: 'string' } } }
    }
  }
};

const docsHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Profesores API</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head>
<body><div id="ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#ui' });</script></body></html>`;

/* ---------- Utilidades ---------- */

const send = (res, status, data) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
};

const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let text = '';

    req.on('data', chunk => {
      text += chunk;
      if (text.length > 1_000_000) {
        reject(fail('Solicitud demasiado grande', 413));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const json = JSON.parse(text || '{}');
        if (json === null || typeof json !== 'object' || Array.isArray(json)) {
          return reject(fail('El cuerpo debe ser un objeto JSON'));
        }
        resolve(json);
      } catch {
        reject(fail('JSON inválido'));
      }
    });

    req.on('error', reject);
  });
}

const validId = id =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

function prepare(body, current = {}) {
  const nombre = body.nombre ?? current.nombre;
  const departamento = body.departamento ?? current.departamento;

  if (typeof nombre !== 'string' || !nombre.trim() ||
      typeof departamento !== 'string' || !departamento.trim()) {
    throw fail('Nombre y departamento son obligatorios');
  }

  const reserved = ['id', 'nombre', 'departamento', 'datos', 'actualizado_en'];

  const extras = Object.fromEntries(
    Object.entries(body).filter(([key]) => !reserved.includes(key))
  );

  return {
    nombre: nombre.trim(),
    departamento: departamento.trim(),
    datos: { ...(current.datos || {}), ...(body.datos || {}), ...extras },
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

/* ---------- Rutas ---------- */

async function handle(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    if (req.method === 'GET' && (path === '/docs' || path === '/')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(docsHtml);
    }

    if (req.method === 'GET' && path === '/openapi.json') {
      return send(res, 200, openapi);
    }

    if (req.method === 'GET' && path === '/health') {
      return send(res, 200, { status: 'ok' });
    }

    if (req.method === 'GET' && path === '/test-supabase') {
      const { error } = await db.from(TABLE).select('id').limit(1);
      if (error) throw error;
      return send(res, 200, { conectado: true });
    }

    if (req.method === 'GET' && path === '/profesores') {
      const { data, error } = await db.from(TABLE).select('*').order('nombre');
      if (error) throw error;
      return send(res, 200, data.map(format));
    }

    if (req.method === 'POST' && path === '/profesores') {
      const body = await readBody(req);
      const id = body.id || randomUUID();

      if (!validId(id)) throw fail('ID UUID inválido');

      const { data, error } = await db
        .from(TABLE)
        .insert({ id, ...prepare(body) })
        .select('*')
        .single();

      if (error) throw error;
      return send(res, 201, format(data));
    }

    const search = path.match(/^\/search\/(.+)$/);

    if (req.method === 'GET' && search) {
      let nombre;
      try {
        nombre = decodeURIComponent(search[1]).trim();
      } catch {
        throw fail('Nombre mal codificado');
      }
      if (!nombre) throw fail('Indica un nombre');

      const { data, error } = await db
        .from(TABLE)
        .select('*')
        .ilike('nombre', `%${nombre}%`);

      if (error) throw error;
      return send(res, 200, data.map(format));
    }

    const match = path.match(/^\/profesores\/([^/]+)$/);

    if (match && ['PUT', 'DELETE'].includes(req.method)) {
      const id = match[1];

      if (!validId(id)) throw fail('ID UUID inválido');

      if (req.method === 'DELETE') {
        const { data, error } = await db
          .from(TABLE)
          .delete()
          .eq('id', id)
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (!data) throw fail('Profesor no encontrado', 404);

        return send(res, 200, { mensaje: 'Profesor eliminado', id });
      }

      const body = await readBody(req);

      const { data: current, error: findError } = await db
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (findError) throw findError;
      if (!current) throw fail('Profesor no encontrado', 404);

      const { data, error } = await db
        .from(TABLE)
        .update(prepare(body, current))
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return send(res, 200, format(data));
    }

    throw fail('Ruta no encontrada', 404);

  } catch (error) {
    // Errores propios traen status; los de Supabase se mapean por código
    const status = error.status ||
      (error.code === '23505' ? 409 : ['22P02', '23502'].includes(error.code) ? 400 : 500);

    if (status === 500) console.error('Error API:', error);

    return send(res, status, {
      error: status === 500 ? 'Error del servidor' : error.message,
      codigo: error.code || undefined
    });
  }
}

http.createServer(handle).listen(process.env.PORT || 3000, () => {
  console.log('Profesores API funcionando. Docs en /docs');
});