
const http = require('http');
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
const TABLE = 'profesores';

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY');
}

const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

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
        resolve(JSON.parse(text || '{}'));
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

  const reserved = [
    'id', 'nombre', 'departamento', 'datos', 'actualizado_en'
  ];

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

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host || 'localhost'}`
    );
    const path = url.pathname;

    if (req.method === 'GET' && path === '/health') {
      return send(res, 200, { status: 'ok' });
    }

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
      const nombre = decodeURIComponent(search[1]).trim();
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

    return send(res, 404, { error: 'Ruta no encontrada' });

  } catch (error) {
    console.error('Error API:', error.message);

    const status = error.status ||
      (error.code === '23505' ? 409 : 500);

    return send(res, status, {
      error: error.message || 'Error del servidor',
      codigo: error.code || undefined
    });
  }
}

http.createServer(handle).listen(process.env.PORT || 3000, () => {
  console.log('Profesores API funcionando');
});
