const http = require('http');
const { MongoClient } = require('mongodb');

// Leer URI de la base de datos de las variables de entorno
const MONGO_URL = process.env.MONGO_URL;
let dbClient = null;
let db = null;

// Conexión a MongoDB (patrón Singleton)
async function getDb() {
  if (!db) {
    dbClient = new MongoClient(MONGO_URL);
    await dbClient.connect();
    db = dbClient.db('escuela_db');
  }
  return db;
}

// Definición de OpenAPI (Swagger)
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Profesores API - Microservicio Nativo',
    version: '1.0.0',
    description: 'API REST para consultar profesores (Hecho solo con Node.js nativo sin Express)'
  },
  servers: [{ url: process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000' }],
  paths: {
    '/health': {
      get: {
        summary: 'Estado del servicio',
        responses: { 200: { description: 'OK' } }
      }
    },
    '/profesores': {
      get: {
        summary: 'Obtener todos los profesores',
        responses: { 200: { description: 'Lista de profesores' } }
      }
    },
    '/profesores/search/{name}': {
      get: {
        summary: 'Buscar profesor por nombre',
        parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Resultados de búsqueda' } }
      }
    }
  }
};

const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/swagger.json',
        dom_id: '#swagger-ui',
      });
    };
  </script>
</body>
</html>
`;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  try {
    if (req.method === 'GET') {
      // Documentación Swagger
      if (req.url === '/api-docs') {
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        return res.end(swaggerHtml);
      }
      
      if (req.url === '/swagger.json') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        return res.end(JSON.stringify(swaggerDocument));
      }

      const database = await getDb();
      const collection = database.collection('profesores');
      res.setHeader('Content-Type', 'application/json');
      
      if (req.url === '/health') {
        res.writeHead(200);
        return res.end(JSON.stringify({ status: 'ok', service: 'profesores-node' }));
      }
      
      if (req.url === '/profesores' || req.url === '/profesores/') {
        const profesores = await collection.find({}).toArray();
        res.writeHead(200);
        return res.end(JSON.stringify(profesores));
      }

      if (req.url.startsWith('/profesores/search/')) {
        const urlParts = req.url.split('/');
        const searchName = decodeURIComponent(urlParts[3] || '');
        const profesores = await collection.find({ name: new RegExp(searchName, 'i') }).toArray();
        res.writeHead(200);
        return res.end(JSON.stringify(profesores));
      }
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Ruta no encontrada' }));

  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: error.message }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Profesores service running on port ${PORT}`);
});
