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
      title: 'Pokemon API',
      version: '1.0.0',
      description: 'API for 10 Pokemons using PostgreSQL',
    },
    servers: [{ url: 'http://localhost:3000' }, { url: process.env.RENDER_EXTERNAL_URL || '' }],
  },
  apis: ['index.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const initDb = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS pokemons (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      type VARCHAR(50),
      image_url TEXT
    );
    INSERT INTO pokemons (name, type, image_url)
    SELECT * FROM (VALUES
      ('Bulbasaur', 'Grass/Poison', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'),
      ('Charmander', 'Fire', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png'),
      ('Squirtle', 'Water', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png'),
      ('Pikachu', 'Electric', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'),
      ('Jigglypuff', 'Normal/Fairy', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png'),
      ('Meowth', 'Normal', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/52.png'),
      ('Psyduck', 'Water', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/54.png'),
      ('Machop', 'Fighting', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/66.png'),
      ('Geodude', 'Rock/Ground', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/74.png'),
      ('Gengar', 'Ghost/Poison', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png')
    ) AS v(name, type, image_url)
    WHERE NOT EXISTS (SELECT 1 FROM pokemons LIMIT 1);
  `;
  try {
    await pool.query(query);
  } catch (err) {
    console.error(err);
  }
};

initDb();

/**
 * @swagger
 * /pokemons:
 *   get:
 *     summary: Get all 10 pokemons
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/pokemons', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pokemons');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Pokemon service running on port ${port}`);
});
