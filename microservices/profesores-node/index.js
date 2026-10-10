const http = require('http');
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
throw new Error('Faltan las variables de Supabase');
}

const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);
const TABLE = 'profesores';

const send = (res, status, data, contentType = 'application/json; charset=utf-8') => {
res.writeHead(status, {
'Content-Type': contentType,
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Headers': 'Content-Type, Authorization',
'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
});
res.end(contentType.includes('json') ? JSON.stringify(data) : data);
};

const readBody = req => new Promise((resolve, reject) => {
let text = '';
req.on('data', chunk => text += chunk);
req.on('end', () => {
try {
resolve(JSON.parse(text || '{}'));
} catch {
reject(Object.assign(new Error('JSON inválido'), { status: 400 }));
}
});
req.on('error', reject);
});

function prepare(body, oldData = {}) {
const { id, nombre, departamento, datos, ...extra } = body;

if (typeof nombre !== 'string' || !nombre.trim() ||
typeof departamento !== 'string' || !departamento.trim()) {
throw Object.assign(
new Error('Nombre y departamento son obligatorios'),
{ status: 400 }
);
}

return {
nombre: nombre.trim(),
departamento: departamento.trim(),
datos: { ...oldData, ...(datos || {}), ...extra },
actualizado_en: new Date().toISOString()
};
}

const format = row => ({
...(row.datos || {}),
id: row.id,
nombre: row.nombre,
departamento: row.departamento,
actualizado_en: row.actualizado_en,
eliminado: row.eliminado
});

// Definición de la especificación Swagger en formato JSON para servirla directamente
const swaggerDocument = {
openapi: '3.0.3',
info: {
title: 'API de Profesores (Microservicio Node.js + Supabase)',
version: '1.0.0',
description: 'Microservicio nativo en Node.js para la gestión de profesores con soporte para Swagger UI.'
},
servers: [
{ url: 'http://localhost:3000', description: 'Servidor Local' }
],
paths: {
'/health': {
get: {
summary: 'Verificar estado del servidor',
responses: {
'200': { description: 'Servidor funcionando correctamente.' }
}
}
},
'/test-supabase': {
get: {
summary: 'Probar conexión con Supabase',
responses: {
'200': { description: 'Conexión exitosa.' },
'500': { description: 'Error de conexión.' }
}
}
},
'/profesores': {
get: {
summary: 'Obtener lista de profesores activos',
responses: {
'200': { description: 'Lista obtenida exitosamente.' }
}
},
post: {
summary: 'Crear un nuevo profesor',
requestBody: {
required: true,
content: {
'application/json': {
schema: {
type: 'object',
required: ['nombre', 'departamento'],
properties: {
nombre: { type: 'string', example: 'Ana Gómez' },
departamento: { type: 'string', example: 'Ingeniería' }
}
}
}
}
},
responses: {
'201': { description: 'Profesor creado.' }
}
}
},
'/search/{nombre}': {
get: {
summary: 'Buscar profesores por nombre',
parameters: [
{ name: 'nombre', in: 'path', required: true, schema: { type: 'string' } }
],
responses: {
'200': { description: 'Resultados de la búsqueda.' }
}
}
},
'/profesores/{id}': {
put: {
summary: 'Actualizar profesor',
parameters: [
{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }
],
responses: {
'200': { description: 'Actualizado correctamente.' }
}
},
delete: {
summary: 'Eliminar profesor',
parameters: [
{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }
],
responses: {
'200': { description: 'Eliminado correctamente.' }
}
}
}
}
};

http.createServer(async (req, res) => {
if (req.method === 'OPTIONS') {
res.writeHead(204, {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Headers': 'Content-Type, Authorization',
'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
});
return res.end();
}

try {
const path = new URL(req.url, http://${req.headers.host || 'localhost'}).pathname;

// Ruta de la Interfaz Visual de Swagger
if (req.method === 'GET' && (path === '/docs' || path === '/docs/')) {
  const html = `<!DOCTYPE html>
  html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <title>Swagger UI - API de Profesores</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '/docs/json',
          dom_id: '#swagger-ui',
        });
      };
    </script>
  </body>
  </html>`;
  return send(res, 200, html, 'text/html; charset=utf-8');
}

if (req.method === 'GET' && path === '/docs/json') {
  return send(res, 200, swaggerDocument);
}

if (req.method === 'GET' && path === '/health')
  return send(res, 200, { status: 'ok' });

if (req.method === 'GET' && path === '/test-supabase') {
  const { error } = await db.from(TABLE).select('id').limit(1);
  if (error) throw error;
  return send(res, 200, { conectado: true });
}

// Filtrar por eliminado = false basado en tu esquema de base de datos
if (req.method === 'GET' && path === '/profesores') {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('eliminado', false)
    .order('nombre');

  if (error) throw error;
  return send(res, 200, data.map(format));
}

if (req.method === 'POST' && path === '/profesores') {
  const body = await readBody(req);
  const id = body.id || randomUUID();

  const { data, error } = await db
    .from(TABLE)
    .insert({ id, eliminado: false, ...prepare(body) })
    .select('*')
    .single();

  if (error) throw error;
  return send(res, 201, format(data));
}

const search = path.match(/^\/search\/(.+)$/);
if (req.method === 'GET' && search) {
  const nombre = decodeURIComponent(search[1]).trim();
  if (!nombre)
    throw Object.assign(new Error('Indica un nombre'), { status: 400 });

  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('eliminado', false)
    .ilike('nombre', `%${nombre}%`);

  if (error) throw error;
  return send(res, 200, data.map(format));
}

const match = path.match(/^\/profesores\/([^/]+)$/);
if (match && ['PUT', 'DELETE'].includes(req.method)) {
  const id = match[1];

  if (req.method === 'DELETE') {
    // Implementación de borrado lógico recomendado para la columna 'eliminado'
    const { data, error } = await db
      .from(TABLE)
      .update({ eliminado: true, actualizado_en: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data)
      throw Object.assign(new Error('Profesor no encontrado'), { status: 404 });

    return send(res, 200, { mensaje: 'Profesor eliminado lógicamente' });
  }

  const body = await readBody(req);
  const { data: actual, error: findError } = await db
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .eq('eliminado', false)
    .maybeSingle();

  if (findError) throw findError;
  if (!actual)
    throw Object.assign(new Error('Profesor no encontrado'), { status: 404 });

  const merged = {
    ...actual.datos,
    ...body,
    nombre: body.nombre ?? actual.nombre,
    departamento: body.departamento ?? actual.departamento
  };

  const { data, error } = await db
    .from(TABLE)
    .update(prepare(merged, actual.datos))
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return send(res, 200, format(data));
}

return send(res, 404, { error: 'Ruta no encontrada' });


} catch (error) {
console.error('Error:', error.message);
const status = error.status || (error.code === '23505' ? 409 : 500);
return send(res, status, {
error: status === 500 ? 'Error del servidor. Revisa los logs.' : error.message
});
}
}).listen(process.env.PORT || 3000, () => {
console.log('Profesores API funcionando con Swagger en /docs');
});