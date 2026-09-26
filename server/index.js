const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/consultaPokemon/:name', async (req, res) => {
  const { name } = req.params;
  
  if (!name) {
    return res.status(400).json({ error: 'Nombre de Pokemon requerido' });
  }

  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase().trim()}`);
    
    if (!response.ok) {
      return res.status(404).json({ error: 'Pokemon no encontrado' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching Pokemon:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de Pokemon escuchando en puerto ${PORT}`);
});
