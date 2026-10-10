const http = require('http');
const { MongoClient, ObjectId } = require('mongodb');
const swaggerJsDoc = require('swagger-jsdoc');


const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SECRET_KEY) {
  throw new Error('Faltan las variables de Supabase');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);


/**
 * @swagger
 * components:
 *   schemas:
 *     Profesor:
 *       type: object
 *       required:
 *         - nombre
 *         - departamento
 *       properties:
 *         nombre:
 *           type: string
 *           description: Nombre del profesor
 *         departamento:
 *           type: string
 *           description: Departamento al que pertenece
 * 
 * /profesores:
 *   get:
 *     summary: Obtener todos los profesores
 *     responses:
 *       200:
 *         description: Lista de profesores
 *   post:
 *     summary: Crear un nuevo profesor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Profesor'
 *     responses:
 *       201:
 *         description: Profesor creado exitosamente
 * 
 * /profesores/{id}:
 *   put:
 *     summary: Actualizar un profesor existente
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
 *             $ref: '#/components/schemas/Profesor'
 *     responses:
 *       200:
 *         description: Profesor actualizado exitosamente
 *   delete:
 *     summary: Eliminar un profesor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profesor eliminado exitosamente
 * 
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
    info: { title: 'Profesores API', version: '1.0.0', description: 'Microservicio CRUD para consultar y gestionar profesores' },
    servers: [{ url: process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000' }],
  },
  apis: [__filename],
});

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

const getRequestBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.writeHead(200).end();

  if (req.url === '/api-docs' || req.url === '/api-docs/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(swaggerHtml);
  }

  if (req.url === '/swagger.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(swaggerSpec));
  }

  try {
    const database = await getDb();
    const collection = database.collection('profesores');

    if (req.url.startsWith('/search/') && req.method === 'GET') {
      const searchName = decodeURIComponent(req.url.split('/')[2] || '');
      const profesores = await collection.find({ nombre: { $regex: searchName, $options: 'i' } }).toArray();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(profesores));
    }

    if (req.url === '/profesores' && req.method === 'GET') {
      const profesores = await collection.find({}).toArray();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(profesores));
    }

    if (req.url === '/profesores' && req.method === 'POST') {
      const body = await getRequestBody(req);
      const result = await collection.insertOne(body);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Profesor creado', id: result.insertedId }));
    }

    if (req.url.startsWith('/profesores/') && req.method === 'PUT') {
      const id = req.url.split('/')[2];
      const body = await getRequestBody(req);
      const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: body });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Profesor actualizado', modifiedCount: result.modifiedCount }));
    }

    if (req.url.startsWith('/profesores/') && req.method === 'DELETE') {
      const id = req.url.split('/')[2];
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Profesor eliminado', deletedCount: result.deletedCount }));
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: err.message }));
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Profesores service en puerto ${PORT}`));
