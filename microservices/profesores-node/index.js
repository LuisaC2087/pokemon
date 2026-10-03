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
    // Usamos una base de datos de profesores (o la que se prefiera)
    db = dbClient.db('escuela_db');
    
    // Opcional: inicializar datos si está vacía
    const count = await db.collection('profesores').countDocuments();
    if (count === 0) {
      await db.collection('profesores').insertMany([
        { name: 'Kakashi Hatake', subject: 'Supervivencia', age: 30, department: 'Ninja', image_url: 'https://cdn.myanimelist.net/images/characters/7/284124.jpg' },
        { name: 'Koro-sensei', subject: 'Asesinato', age: 'Desconocida', department: 'Clase E', image_url: 'https://cdn.myanimelist.net/images/characters/11/276412.jpg' },
        { name: 'Satoru Gojo', subject: 'Hechicería', age: 28, department: 'Jujutsu', image_url: 'https://cdn.myanimelist.net/images/characters/15/422168.jpg' },
        { name: 'Shota Aizawa', subject: 'Héroes', age: 31, department: 'Clase 1-A', image_url: 'https://cdn.myanimelist.net/images/characters/3/305216.jpg' }
      ]);
    }
  }
  return db;
}

const server = http.createServer(async (req, res) => {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    const database = await getDb();
    const collection = database.collection('profesores');

    if (req.method === 'GET') {
      
      // Ruta: /health
      if (req.url === '/health') {
        res.writeHead(200);
        return res.end(JSON.stringify({ status: 'ok', service: 'profesores-node' }));
      }
      
      // Ruta: /profesores
      if (req.url === '/profesores' || req.url === '/profesores/') {
        const profesores = await collection.find({}).toArray();
        res.writeHead(200);
        return res.end(JSON.stringify(profesores));
      }

      // Ruta: /profesores/search/:name
      if (req.url.startsWith('/profesores/search/')) {
        const urlParts = req.url.split('/');
        const searchName = decodeURIComponent(urlParts[3] || '');
        
        const profesores = await collection.find({ 
          name: new RegExp(searchName, 'i') 
        }).toArray();
        
        res.writeHead(200);
        return res.end(JSON.stringify(profesores));
      }
    }

    // Ruta no encontrada
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
