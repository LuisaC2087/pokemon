const http = require('http');
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error('Faltan las variables de Supabase');
}

const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);
const TABLE = 'profesores';

const send = (res, status, data) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
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
  actualizado_en: row.actualizado_en
});

const validId = id =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

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
    const path = new URL(
      req.url, `http://${req.headers.host || 'localhost'}`
    ).pathname;

    if (req.method === 'GET' && path === '/health')
      return send(res, 200, { status: 'ok' });

    if (req.method === 'GET' && path === '/test-supabase') {
      const { error } = await db.from(TABLE).select('id').limit(1);
      if (error) throw error;
      return send(res, 200, { conectado: true });
    }

    if (req.method === 'GET' && path === '/profesores') {
      const { data, error } = await db
        .from(TABLE).select('*').order('nombre');

      if (error) throw error;
      return send(res, 200, data.map(format));
    }

    if (req.method === 'POST' && path === '/profesores') {
      const body = await readBody(req);
      const id = body.id || randomUUID();

      if (!validId(id))
        throw Object.assign(new Error('ID UUID inválido'), { status: 400 });

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
      const nombre = decodeURIComponent(search[1]).trim();
      if (!nombre)
        throw Object.assign(new Error('Indica un nombre'), { status: 400 });

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

      if (!validId(id))
        throw Object.assign(new Error('ID UUID inválido'), { status: 400 });

      if (req.method === 'DELETE') {
        const { data, error } = await db
          .from(TABLE).delete().eq('id', id).select('id').maybeSingle();

        if (error) throw error;
        if (!data)
          throw Object.assign(new Error('Profesor no encontrado'), { status: 404 });

        return send(res, 200, { mensaje: 'Profesor eliminado' });
      }

      const body = await readBody(req);
      const { data: actual, error: findError } = await db
        .from(TABLE).select('*').eq('id', id).maybeSingle();

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
    const status = error.status ||
      (error.code === '23505' ? 409 : 500);

    return send(res, status, {
      error: status === 500
        ? 'Error del servidor. Revisa los logs de Render.'
        : error.message
    });
  }
}).listen(process.env.PORT || 3000, () => {
  console.log('Profesores API funcionando');
});