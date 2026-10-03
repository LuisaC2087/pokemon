const http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const swaggerJsDoc = require('swagger-jsdoc');

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

const swaggerSpec = swaggerJsDoc({
  swaggerDefinition: {
    openapi: '3.0.0',
    info: { title: 'Profesores API', version: '1.0.0', description: 'Microservicio simple para consultar profesores' },
    servers: [{ url: process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000' }],
  },
  apis: ['index.js'],
});

// Ruta a los archivos estáticos de swagger-ui-dist
const swaggerUiPath = path.dirname(require.resolve('swagger-ui-dist/package.json'));

const server = http.createServer(async (req, res) => {
  // CORS manual
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.writeHead(200).end();

  // Swagger JSON
  if (req.url === '/swagger.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(swaggerSpec));
  }

  // Swagger UI
  if (req.url === '/api-docs' || req.url === '/api-docs/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(`<!DOCTYPE html><html><head><title>API Docs</title>
      <link rel="stylesheet" href="/api-docs/swagger-ui.css">
      </head><body><div id="swagger-ui"></div>
      <script src="/api-docs/swagger-ui-bundle.js"></script>
      <script>SwaggerUIBundle({ url: '/swagger.json', dom_id: '#swagger-ui' });</script>
      </body></html>`);
  }

  if (req.url.startsWith('/api-docs/')) {
    const fileName = req.url.replace('/api-docs/', '');
    const filePath = path.join(swaggerUiPath, fileName);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const types = { '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.map': 'application/json' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  // ÚNICA API: Buscar profesor por nombre
  if (req.method === 'GET' && req.url.startsWith('/search/')) {
    try {
      const searchName = decodeURIComponent(req.url.split('/')[2] || '');
      const database = await getDb();
      const profesores = await database.collection('profesores')
        .find({ name: { $regex: searchName, $options: 'i' } })
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
