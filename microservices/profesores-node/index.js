/**
 * Microservicio de Profesores / Docentes
 * Arquitectura: Node.js + Express + Supabase (PostgreSQL) + Swagger OpenAPI 3.0
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── CONFIGURACIÓN SUPABASE ──────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
const TABLE = 'profesores';

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      const err = new Error('Variables SUPABASE_URL o SUPABASE_SECRET_KEY/SUPABASE_ANON_KEY no configuradas en el entorno');
      err.status = 503;
      throw err;
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

// ── DOCUMENTACIÓN SWAGGER (OPENAPI 3.0) ──────────────────────
const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Profesores API - Microservicio Supabase',
      version: '2.0.0',
      description: `
API REST para la gestión de profesores y docentes universitarios.
Conectada a la base de datos en la nube **Supabase (PostgreSQL)** y optimizada para sincronización con **SQLite** en dispositivos móviles.

### Campos de cada Profesor:
* **id**: Identificador único (UUID)
* **nombre**: Nombre completo (Obligatorio)
* **departamento**: Departamento académico (Obligatorio)
* **profesion**: Título o cargo profesional
* **email**: Correo electrónico de contacto
* **telefono**: Número de contacto telefónico
* **imagen_url**: Enlace a la fotografía o imagen en Base64
* **actualizado_en**: Marca de tiempo ISO de la última modificación
      `,
      contact: {
        name: 'Soporte Docente',
      },
    },
    servers: [
      {
        url: process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000',
        description: 'Servidor activo',
      },
    ],
    tags: [
      { name: 'Profesores', description: 'Operaciones CRUD y sincronización de docentes' },
      { name: 'Sistema', description: 'Monitoreo de salud y conectividad' },
    ],
    components: {
      schemas: {
        Profesor: {
          type: 'object',
          required: ['id', 'nombre', 'departamento'],
          properties: {
            id: { type: 'string', format: 'uuid', example: 'd3b07384-d113-4f90-8a12-87063d89d9f1' },
            nombre: { type: 'string', example: 'Dra. Elena Ramos' },
            departamento: { type: 'string', example: 'Ciencias de la Computación' },
            profesion: { type: 'string', example: 'Profesora Titular' },
            email: { type: 'string', format: 'email', example: 'elena.ramos@universidad.edu' },
            telefono: { type: 'string', example: '+57 301 555 1234' },
            imagen_url: { type: 'string', example: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2' },
            actualizado_en: { type: 'string', format: 'date-time', example: '2026-10-16T18:00:00.000Z' }
          }
        },
        ProfesorInput: {
          type: 'object',
          required: ['nombre', 'departamento'],
          properties: {
            id: { type: 'string', description: 'Opcional. Si no se envía se autogenera un UUID.', example: 'd3b07384-d113-4f90-8a12-87063d89d9f1' },
            nombre: { type: 'string', example: 'Dra. Elena Ramos' },
            departamento: { type: 'string', example: 'Ciencias de la Computación' },
            profesion: { type: 'string', example: 'Profesora Titular' },
            email: { type: 'string', format: 'email', example: 'elena.ramos@universidad.edu' },
            telefono: { type: 'string', example: '+57 301 555 1234' },
            imagen_url: { type: 'string', example: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2' }
          }
        },
        RespuestaEliminacion: {
          type: 'object',
          properties: {
            mensaje: { type: 'string', example: 'Profesor eliminado exitosamente' },
            id: { type: 'string', example: 'd3b07384-d113-4f90-8a12-87063d89d9f1' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Mensaje descriptivo del error' },
            codigo: { type: 'string', example: '404' }
          }
        }
      }
    }
  },
  apis: ['./index.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Servir UI en /docs y /api-docs, y JSON en /openapi.json
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.get('/openapi.json', (req, res) => res.json(swaggerDocs));

// ── HELPERS DE VALIDACIÓN ───────────────────────────────────
function limpiarDatosProfesor(body, actual = {}) {
  const nombre = body.nombre !== undefined ? String(body.nombre).trim() : actual.nombre;
  const departamento = body.departamento !== undefined ? String(body.departamento).trim() : actual.departamento;

  if (!nombre || !departamento) {
    const error = new Error('Los campos "nombre" y "departamento" son obligatorios');
    error.status = 400;
    throw error;
  }

  return {
    nombre,
    departamento,
    profesion: (body.profesion !== undefined ? String(body.profesion) : (actual.profesion || '')).trim(),
    email: (body.email !== undefined ? String(body.email) : (actual.email || '')).trim(),
    telefono: (body.telefono !== undefined ? String(body.telefono) : (actual.telefono || '')).trim(),
    imagen_url: (body.imagen_url !== undefined ? String(body.imagen_url) : (body.image_url !== undefined ? String(body.image_url) : (actual.imagen_url || ''))).trim(),
    actualizado_en: new Date().toISOString()
  };
}

// ── RUTAS DEL SERVICIO ──────────────────────────────────────

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Estado de salud del microservicio
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: El microservicio se encuentra en línea
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'supabase', timestamp: new Date().toISOString() });
});

/**
 * @swagger
 * /test-supabase:
 *   get:
 *     summary: Probar conexión con la base de datos Supabase
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Conexión establecida con éxito
 *       500:
 *         description: Error conectando a Supabase
 */
app.get('/test-supabase', async (req, res, next) => {
  try {
    const db = getSupabase();
    const { data, error } = await db.from(TABLE).select('id').limit(1);
    if (error) throw error;
    res.json({ conectado: true, total_encontrados: data ? data.length : 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /profesores:
 *   get:
 *     summary: Listar todos los profesores
 *     description: Obtiene la lista completa de docentes ordenados alfabéticamente por nombre.
 *     tags: [Profesores]
 *     responses:
 *       200:
 *         description: Lista de profesores obtenida con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Profesor'
 */
app.get('/profesores', async (req, res, next) => {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from(TABLE)
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /profesores/since/{timestamp}:
 *   get:
 *     summary: Obtener profesores modificados desde una fecha/timestamp
 *     description: Endpoint clave para sincronización incremental móvil.
 *     tags: [Profesores]
 *     parameters:
 *       - in: path
 *         name: timestamp
 *         required: true
 *         schema:
 *           type: string
 *         description: Fecha ISO 8601 o timestamp (ej. 2026-10-16T12:00:00Z)
 *     responses:
 *       200:
 *         description: Profesores actualizados desde la fecha dada
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Profesor'
 */
app.get('/profesores/since/:timestamp', async (req, res, next) => {
  try {
    const { timestamp } = req.params;
    const db = getSupabase();
    const { data, error } = await db
      .from(TABLE)
      .select('*')
      .gt('actualizado_en', decodeURIComponent(timestamp))
      .order('actualizado_en', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /search/{nombre}:
 *   get:
 *     summary: Buscar profesores por nombre
 *     tags: [Profesores]
 *     parameters:
 *       - in: path
 *         name: nombre
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resultados de la búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Profesor'
 */
app.get('/search/:nombre', async (req, res, next) => {
  try {
    const nombre = req.params.nombre?.trim();
    if (!nombre) return res.status(400).json({ error: 'Debes proporcionar un término de búsqueda' });

    const db = getSupabase();
    const { data, error } = await db
      .from(TABLE)
      .select('*')
      .ilike('nombre', `%${nombre}%`);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /profesores/{id}:
 *   get:
 *     summary: Obtener un profesor por su ID
 *     tags: [Profesores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profesor encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profesor'
 *       404:
 *         description: No encontrado
 */
app.get('/profesores/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getSupabase();
    const { data, error } = await db
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Profesor no encontrado' });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /profesores:
 *   post:
 *     summary: Crear un nuevo profesor
 *     tags: [Profesores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProfesorInput'
 *     responses:
 *       201:
 *         description: Profesor creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profesor'
 *       400:
 *         description: Datos requeridos faltantes o inválidos
 */
app.post('/profesores', async (req, res, next) => {
  try {
    const db = getSupabase();
    const nuevoId = req.body.id || randomUUID();
    const registro = {
      id: nuevoId,
      ...limpiarDatosProfesor(req.body)
    };

    const { data, error } = await db
      .from(TABLE)
      .insert(registro)
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /profesores/{id}:
 *   put:
 *     summary: Actualizar datos de un profesor existente
 *     tags: [Profesores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProfesorInput'
 *     responses:
 *       200:
 *         description: Profesor actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profesor'
 *       404:
 *         description: Profesor no encontrado
 */
app.put('/profesores/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getSupabase();

    // Verificar existencia previa
    const { data: actual, error: checkError } = await db
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (checkError) throw checkError;
    if (!actual) return res.status(404).json({ error: 'Profesor no encontrado' });

    const datosActualizados = limpiarDatosProfesor(req.body, actual);

    const { data, error } = await db
      .from(TABLE)
      .update(datosActualizados)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /profesores/{id}:
 *   delete:
 *     summary: Eliminar un profesor por su ID
 *     tags: [Profesores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profesor eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RespuestaEliminacion'
 *       404:
 *         description: Profesor no encontrado
 */
app.delete('/profesores/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getSupabase();

    const { data, error } = await db
      .from(TABLE)
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Profesor no encontrado' });

    res.json({ mensaje: 'Profesor eliminado exitosamente', id });
  } catch (err) {
    next(err);
  }
});

// Redirigir la raíz / a /docs para visualización inmediata
app.get('/', (req, res) => res.redirect('/docs'));

// ── MANEJADOR CENTRAL DE ERRORES ────────────────────────────
app.use((err, req, res, next) => {
  const status = err.status || (err.code === '23505' ? 409 : ['22P02', '23502'].includes(err.code) ? 400 : 500);
  if (status === 500) {
    console.error('Error interno en Profesores API:', err);
  }
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
    codigo: err.code || undefined
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Profesores API (Supabase) ejecutándose en puerto ${PORT}`);
  console.log(`Swagger Docs disponibles en: http://localhost:${PORT}/docs`);
});
