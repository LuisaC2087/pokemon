const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());


// ==========================
// POKÉMON
// ==========================

app.get('/consultaPokemon/:name', async (req, res) => {
  const { name } = req.params;

  if (!name) {
    return res.status(400).json({
      error: 'Nombre de Pokemon requerido'
    });
  }

  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${name.toLowerCase().trim()}`
    );

    if (!response.ok) {
      return res.status(404).json({
        error: 'Pokemon no encontrado'
      });
    }

    const data = await response.json();

    res.json(data);

  } catch (error) {
    console.error('Error fetching Pokemon:', error);

    res.status(500).json({
      error: 'Error del servidor'
    });
  }
});


// ==========================
// JUJUTSU - PERSONAJE
// ==========================

app.get('/consultaJujutsu/:name', async (req, res) => {
  const { name } = req.params;

  if (!name) {
    return res.status(400).json({
      error: 'Nombre de personaje requerido'
    });
  }

  try {
    const response = await fetch(
      `https://data.jujutsukaisenapi.site/api/v1/characters/search?q=${encodeURIComponent(
        name.trim()
      )}`
    );

    if (!response.ok) {
      return res.status(404).json({
        error: 'Personaje no encontrado'
      });
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: 'Personaje no encontrado'
      });
    }

    res.json(data);

  } catch (error) {
    console.error('Error fetching Jujutsu character:', error);

    res.status(500).json({
      error: 'Error del servidor'
    });
  }
});


// ==========================
// JUJUTSU - TÉCNICAS
// ==========================

app.get('/consultaTecnica/:name', async (req, res) => {
  const { name } = req.params;

  try {
    const response = await fetch(
      `https://data.jujutsukaisenapi.site/api/v1/cursed-techniques?per_page=100&search=${encodeURIComponent(
        name.trim()
      )}`
    );

    if (!response.ok) {
      return res.status(404).json({
        error: 'Técnica no encontrada'
      });
    }

    const data = await response.json();

    res.json(data);

  } catch (error) {
    console.error('Error fetching cursed technique:', error);

    res.status(500).json({
      error: 'Error del servidor'
    });
  }
});


// ==========================
// JUJUTSU - EXPANSIONES
// ==========================

app.get('/consultaDominio/:name', async (req, res) => {
  const { name } = req.params;

  try {
    const response = await fetch(
      'https://data.jujutsukaisenapi.site/api/v1/domain-expansions'
    );

    if (!response.ok) {
      return res.status(404).json({
        error: 'Expansiones no encontradas'
      });
    }

    const data = await response.json();

    const dominio = data.find(
      (item) =>
        item.user?.name?.toLowerCase() ===
        name.trim().toLowerCase()
    );

    if (!dominio) {
      return res.status(404).json({
        error: 'Dominio no encontrado'
      });
    }

    res.json(dominio);

  } catch (error) {
    console.error('Error fetching domain expansion:', error);

    res.status(500).json({
      error: 'Error del servidor'
    });
  }
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});