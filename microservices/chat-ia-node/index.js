require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const knowledgeBase = require('./knowledgeBase');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.PORT || '3003', 10);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

// Inicializar Google Generative AI
let genAI = null;
if (GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 10) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY.trim());
    console.log(`[Chat-IA] Google Gemini AI inicializado con modelo ${GEMINI_MODEL}`);
  } catch (err) {
    console.error('[Chat-IA] Error inicializando Google Generative AI:', err.message);
  }
} else {
  console.log('[Chat-IA] AVISO: GEMINI_API_KEY no configurada. Configure GEMINI_API_KEY en .env para habilitar las respuestas de la IA.');
}

// Swagger OpenAPI 3.0
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Chat IA - Microservicio',
      version: '1.0.0',
      description: 'Microservicio de Asistente IA conectado a los microservicios de Pokemon, Jujutsu Kaisen y Profesores.',
    },
    servers: [
      { url: process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`, description: 'Servidor principal' },
    ],
  },
  apis: ['index.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Helper para limpiar cualquier emoji
function stripEmojis(text) {
  if (!text) return '';
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}]/gu, '').trim();
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'chat-ia-node',
    hasGeminiKey: Boolean(genAI),
    model: genAI ? GEMINI_MODEL : null,
    counts: {
      pokemons: knowledgeBase.pokemons.length,
      jujutsuCharacters: knowledgeBase.characters.length,
      profesores: knowledgeBase.profesores.length,
    },
    serviceErrors: knowledgeBase.serviceErrors,
    lastSync: knowledgeBase.lastSync,
    timestamp: new Date().toISOString()
  });
});

app.get('/suggestions', (req, res) => {
  res.json({
    suggestions: knowledgeBase.getSuggestedQuestions()
  });
});

app.post('/sync', async (req, res) => {
  try {
    await knowledgeBase.syncFromMicroservices();
    res.json({
      status: 'ok',
      message: 'Sincronizacion con microservicios completada',
      counts: {
        pokemons: knowledgeBase.pokemons.length,
        jujutsuCharacters: knowledgeBase.characters.length,
        profesores: knowledgeBase.profesores.length,
      },
      serviceErrors: knowledgeBase.serviceErrors
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'El campo message es requerido y no puede estar vacio.' });
    }

    // Si la IA no esta configurada, no responder con motores locales: detenerse e informar error
    if (!genAI) {
      return res.status(503).json({
        error: 'El servicio de Inteligencia Artificial no esta disponible. Configure una clave valida en GEMINI_API_KEY para habilitar el asistente.',
        reply: 'El servicio de Inteligencia Artificial no esta configurado actualmente. Por favor verifique la clave de API.',
      });
    }

    const trimmedMessage = message.trim();

    try {
      const systemPrompt = knowledgeBase.buildSystemPrompt();
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 800,
        }
      });

      const contents = [];
      if (Array.isArray(history)) {
        history.slice(-6).forEach(h => {
          if (h.role && h.content) {
            contents.push({
              role: h.role === 'assistant' ? 'model' : h.role,
              parts: [{ text: stripEmojis(h.content) }]
            });
          }
        });
      }

      contents.push({
        role: 'user',
        parts: [{ text: trimmedMessage }]
      });

      const result = await model.generateContent({ contents });
      const textResponse = stripEmojis(result.response.text());

      const outOfScope = textResponse.toLowerCase().includes('fuera de') || 
                         textResponse.toLowerCase().includes('solo tengo acceso') ||
                         textResponse.toLowerCase().includes('limitado estrictamente') ||
                         textResponse.toLowerCase().includes('no puedo responder');

      return res.json({
        reply: textResponse,
        suggestions: knowledgeBase.getSuggestedQuestions().slice(0, 3),
        outOfScope,
        provider: 'gemini'
      });
    } catch (geminiError) {
      console.error('[Chat-IA] Error en llamada a Gemini API:', geminiError.message);
      return res.status(502).json({
        error: 'Error al comunicarse con la Inteligencia Artificial de Gemini.',
        reply: 'El servicio de Inteligencia Artificial no pudo procesar la solicitud en este momento. Por favor intente nuevamente mas tarde.',
        details: geminiError.message
      });
    }

  } catch (error) {
    console.error('[Chat-IA] Error interno:', error);
    res.status(500).json({
      error: 'Error interno en el servicio de Chat IA',
      details: error.message
    });
  }
});

const server = app.listen(PORT, async () => {
  console.log(`[Chat-IA] Microservicio de IA ejecutandose en el puerto ${PORT}`);
  console.log(`[Chat-IA] Documentacion Swagger disponible en: http://localhost:${PORT}/api-docs`);
  
  // Consultar microservicios en segundo plano al arrancar
  knowledgeBase.syncFromMicroservices().catch(err => {
    console.warn('[Chat-IA] Error al consultar microservicios al inicio:', err.message);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Chat-IA] Error: El puerto ${PORT} ya esta en uso.`);
    process.exit(1);
  } else {
    console.error('[Chat-IA] Error del servidor:', err);
  }
});
