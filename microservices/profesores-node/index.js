const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

const app = express();
app.use(cors());

const MONGO_URL = process.env.MONGO_URL;
let db = null;

async function getDb() {
  if (!db) {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db('escuela_db');
  }
  return db;
}

const swaggerDocs = swaggerJsDoc({
  swaggerDefinition: {
    openapi: '3.0.0',
    info: { title: 'Profesores API', version: '1.0.0', description: 'Microservicio simple para consultar profesores' },
    servers: [{ url: process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000' }],
  },
  apis: ['index.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /search/{name}:
 *   get:
 *     summary: Buscar profesor por nombre
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resultados de búsqueda
 */
app.get('/search/:name', async (req, res) => {
  try {
    const database = await getDb();
    const profesores = await database.collection('profesores')
      .find({ name: { $regex: req.params.name, $options: 'i' } })
      .toArray();
    res.json(profesores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Profesores service en puerto ${port}`));
