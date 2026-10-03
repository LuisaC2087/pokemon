const http = require('http');
const { MongoClient } = require('mongodb');
const swaggerJsDoc = require('swagger-jsdoc');

const MONGO_URL = process.env.MONGO_URL;
let db = null;

async function getDb() {
  if (!db) {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db('profesor_db');
  }
  return db;
}

/**
 * @swagger
 * /search/{nombre}:
 *   get:
 *     summary: Buscar profesor por nombre
 *     parameters:
 *       - in: path
 *         name: nombre
 *         required: true
 *         schema:
 *           type: string
 *         example: Elfar
 *     responses:
 *       200:
 *         description: Profesor encontrado
 */

const swaggerSpec = swaggerJsDoc({
  swaggerDefinition: {
    openapi: '3.0.0',
    info: { title: 'Profesores API', version: '1.0.0', description: 'Microservicio simple para consultar profesores' },
    servers: [{ url: process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000' }],
  },
  apis: [__filename],
});

// HTML de Swagger UI usando CDN (sin paquete swagger-ui-dist)
const swaggerHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Profesores API Docs</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js"></script>
  <script>
    SwaggerUIBundle({ url: '/swagger.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis] });
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.writeHead(200).end();

  // Swagger UI (CDN)
  if (req.url === '/api-docs' || req.url === '/api-docs/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(swaggerHtml);
  }

  // Swagger JSON spec
  if (req.url === '/swagger.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(swaggerSpec));
  }

  // ÚNICA API: Buscar profesor por nombre
  if (req.method === 'GET' && req.url.startsWith('/search/')) {
    try {
      const searchName = decodeURIComponent(req.url.split('/')[2] || '');
      const database = await getDb();
      const profesores = await database.collection('profesores')
        .find({ nombre: { $regex: searchName, $options: 'i' } })
        .toArray();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(profesores));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Profesores service en puerto ${PORT}`));
