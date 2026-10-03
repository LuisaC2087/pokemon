require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Pokémon API - Microservicio',
      version: '1.0.0',
      description: 'API REST para consultar información de 10 Pokémon almacenados en una base de datos relacional PostgreSQL. Este microservicio forma parte de una aplicación móvil desarrollada con React Native / Expo.',
      contact: {
        name: 'Soporte',
      },
    },
    servers: [
      { url: process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000', description: 'Servidor principal' },
    ],
    tags: [
      { name: 'Pokémon', description: 'Operaciones relacionadas con los Pokémon' },
      { name: 'Estado', description: 'Verificación del estado del servicio' },
    ],
  },
  apis: ['index.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verificar estado del servicio
 *     description: Retorna el estado actual del microservicio y la conexión a la base de datos.
 *     tags: [Estado]
 *     responses:
 *       200:
 *         description: El servicio está funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: pokemon-api
 *                 database:
 *                   type: string
 *                   example: PostgreSQL
 *                 timestamp:
 *                   type: string
 *                   example: "2026-10-02T22:00:00.000Z"
 */
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'pokemon-api',
      database: 'PostgreSQL',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({ status: 'error', message: 'Base de datos no disponible' });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Pokemon:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único del Pokémon
 *           example: 1
 *         name:
 *           type: string
 *           description: Nombre del Pokémon
 *           example: Pikachu
 *         type:
 *           type: string
 *           description: Tipo elemental del Pokémon
 *           example: Electric
 *         image_url:
 *           type: string
 *           description: URL de la imagen sprite del Pokémon
 *           example: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png
 *         height:
 *           type: integer
 *           description: Altura del Pokémon en decímetros
 *           example: 4
 *         weight:
 *           type: integer
 *           description: Peso del Pokémon en hectogramos
 *           example: 60
 *         ability:
 *           type: string
 *           description: Habilidad principal del Pokémon
 *           example: Static
 *         hp:
 *           type: integer
 *           description: Puntos de salud base del Pokémon
 *           example: 35
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Mensaje de error
 *           example: Error interno del servidor
 */

/**
 * @swagger
 * /pokemons:
 *   get:
 *     summary: Obtener todos los Pokémon
 *     description: Retorna la lista completa de los 10 Pokémon almacenados en la base de datos PostgreSQL, incluyendo su nombre, tipo, imagen, altura, peso, habilidad y puntos de salud.
 *     tags: [Pokémon]
 *     responses:
 *       200:
 *         description: Lista de Pokémon obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pokemon'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/pokemons', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pokemons ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /pokemons/{id}:
 *   get:
 *     summary: Obtener un Pokémon por ID
 *     description: Retorna la información detallada de un Pokémon específico según su ID.
 *     tags: [Pokémon]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID numérico del Pokémon (1-10)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 4
 *     responses:
 *       200:
 *         description: Pokémon encontrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pokemon'
 *       404:
 *         description: Pokémon no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Pokémon no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/pokemons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM pokemons WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pokémon no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /pokemons/search/{name}:
 *   get:
 *     summary: Buscar Pokémon por nombre
 *     description: Busca Pokémon cuyo nombre coincida parcialmente con el término de búsqueda (no distingue mayúsculas/minúsculas).
 *     tags: [Pokémon]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: Nombre o parte del nombre del Pokémon a buscar
 *         schema:
 *           type: string
 *           example: pika
 *     responses:
 *       200:
 *         description: Resultados de la búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pokemon'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/pokemons/search/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const result = await pool.query('SELECT * FROM pokemons WHERE LOWER(name) LIKE $1 ORDER BY id', [`%${name.toLowerCase()}%`]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /pokemons/type/{type}:
 *   get:
 *     summary: Filtrar Pokémon por tipo
 *     description: Retorna todos los Pokémon que coincidan con el tipo elemental indicado (por ejemplo Fire, Water, Electric).
 *     tags: [Pokémon]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         description: Tipo elemental del Pokémon
 *         schema:
 *           type: string
 *           example: Water
 *     responses:
 *       200:
 *         description: Pokémon filtrados por tipo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pokemon'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/pokemons/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const result = await pool.query('SELECT * FROM pokemons WHERE LOWER(type) LIKE $1 ORDER BY id', [`%${type.toLowerCase()}%`]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Pokemon service running on port ${port}`);
});
