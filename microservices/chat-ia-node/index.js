require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const knowledgeBase = require('./knowledgeBase');
const aiProviders = require('./aiProviders');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.PORT || '3003', 10);

// Swagger OpenAPI 3.0
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Chat IA - Microservicio Multi-Modelo',
      version: '1.1.0',
      description:
        'Microservicio de Asistente IA conectado a los microservicios de Pokemon, Jujutsu Kaisen y Profesores. Soporta multiples proveedores de IA (Google Gemini, OpenAI, DeepSeek) y tiempo de espera parametrizable.',
    },
    servers: [
      { url: process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`, description: 'Servidor principal' },
    ],
  },
  apis: ['index.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.get('/', (req, res) => res.redirect('/docs'));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Estado de salud del microservicio y de los proveedores de IA
 *     responses:
 *       200:
 *         description: Estado del servicio
 */
app.get('/health', (req, res) => {
  const providers = aiProviders.getProvidersStatus();
  res.json({
    status: 'ok',
    service: 'chat-ia-node',
    providers,
    hasGeminiKey: aiProviders.isProviderConfigured('gemini'),
    hasGroqKey: aiProviders.isProviderConfigured('groq'),
    hasOpenAIKey: aiProviders.isProviderConfigured('openai'),
    hasDeepSeekKey: aiProviders.isProviderConfigured('deepseek'),
    counts: {
      pokemons: knowledgeBase.pokemons.length,
      jujutsuCharacters: knowledgeBase.characters.length,
      profesores: knowledgeBase.profesores.length,
    },
    serviceErrors: knowledgeBase.serviceErrors,
    lastSync: knowledgeBase.lastSync,
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /providers:
 *   get:
 *     summary: Lista de proveedores de Inteligencia Artificial configurados y tiempos de espera permitidos
 *     responses:
 *       200:
 *         description: Lista de proveedores y configuraciones
 */
app.get('/providers', (req, res) => {
  res.json({
    providers: aiProviders.getProvidersStatus(),
    allowedTimeouts: [20, 40, 80, 160],
    defaultTimeout: 40,
    defaultProvider: 'gemini',
  });
});

/**
 * @swagger
 * /suggestions:
 *   get:
 *     summary: Preguntas sugeridas basadas en la base de conocimiento
 *     responses:
 *       200:
 *         description: Lista de preguntas sugeridas
 */
app.get('/suggestions', (req, res) => {
  res.json({
    suggestions: knowledgeBase.getSuggestedQuestions(),
  });
});

/**
 * @swagger
 * /sync:
 *   post:
 *     summary: Fuerza la resincronizacion con los microservicios
 *     responses:
 *       200:
 *         description: Resultado de la sincronizacion
 */
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
      serviceErrors: knowledgeBase.serviceErrors,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Envia una consulta al asistente IA con proveedor y timeout parametrizables
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: Cual es la tecnica de Gojo?
 *               provider:
 *                 type: string
 *                 enum: [gemini, groq, openai, deepseek]
 *                 example: gemini
 *               timeoutSeconds:
 *                 type: integer
 *                 enum: [20, 40, 80, 160]
 *                 example: 40
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Respuesta generada por la IA
 */
app.post('/chat', async (req, res) => {
  try {
    const { message, history, provider = 'gemini', timeoutSeconds = 40 } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'El campo message es requerido y no puede estar vacio.' });
    }

    const selectedProvider = aiProviders.normalizeProvider(provider);
    const parsedTimeout = [20, 40, 80, 160].includes(Number(timeoutSeconds))
      ? Number(timeoutSeconds)
      : 40;
    const timeoutMs = parsedTimeout * 1000;

    // Verificar si el proveedor solicitado esta configurado con credenciales
    if (!aiProviders.isProviderConfigured(selectedProvider)) {
      const providerMeta = aiProviders.getProvidersStatus().find((p) => p.id === selectedProvider);
      const envKey = providerMeta?.envKey || 'API_KEY';
      return res.status(400).json({
        error: `El proveedor ${providerMeta?.name || selectedProvider} no esta configurado en el servidor.`,
        reply: `El proveedor "${providerMeta?.name || selectedProvider}" no tiene una clave valida configurada en el servidor (${envKey} en .env). Por favor configure la variable de entorno o seleccione otro proveedor como Google Gemini.`,
        provider: selectedProvider,
        configured: false,
        timeoutSeconds: parsedTimeout,
      });
    }

    const trimmedMessage = message.trim();

    try {
      // 1. VALIDACIÓN REQUERIDA POR EL NEGOCIO:
      // Validar si la pregunta hace referencia a uno de los personajes en los microservicios de pokemon, anime y profesores.
      const validation = await knowledgeBase.validarReferenciaPersonajes(trimmedMessage);

      // SI NO: Responder directamente al chat que NO es posible SIN consumir el microservicio de la IA
      if (!validation.valid) {
        console.log(`[Chat-IA] Pregunta NO hace referencia a personajes validos de los microservicios (${validation.reason}). Respondiendo sin consumir IA.`);
        return res.json({
          reply: aiProviders.stripEmojis(validation.reply),
          suggestions: knowledgeBase.getSuggestedQuestions().slice(0, 3),
          outOfScope: true,
          aiConsumed: false,
          provider: 'validador_microservicio',
          timeoutSeconds: parsedTimeout,
        });
      }

      // SI SÍ: Consumir el microservicio de la IA seleccionada (Gemini, OpenAI, DeepSeek)
      const toolName = validation.toolName;
      const dbData = validation.dbData;
      console.log(`[Chat-IA] Pregunta valida para ${toolName} (${dbData.results.length} registros). Consumiendo IA (${selectedProvider})...`);

      const instruction = `
Se consulto la base de datos oficial del microservicio en tiempo real para la herramienta "${toolName}".
REGISTROS OFICIALES ENCONTRADOS (${dbData.results.length} registros verificados en la base de datos):
${JSON.stringify(dbData.results, null, 2)}

INSTRUCCION:
- Formula una respuesta completa, util y profesional basada en estos registros encontrados en la base de datos.
- Puedes mejorar y enriquecer la respuesta explicando con claridad los detalles de los elementos encontrados.
- Manten la fidelidad a los datos provistos por el microservicio.
- NO uses ningun emoji en tu respuesta.
`.trim();

      // Generar respuesta usando el proveedor elegido (Gemini, OpenAI, DeepSeek)
      let aiResult;
      try {
        aiResult = await aiProviders.generateAssistantResponse({
          providerId: selectedProvider,
          userMessage: trimmedMessage,
          instruction,
          history,
          timeoutMs,
        });
      } catch (genErr) {
        console.warn(`[Chat-IA] Proveedor ${selectedProvider} fallo al generar texto (${genErr.message}). Preparando respuesta de respaldo.`);
        let textResponse = '';
        if (toolName === 'buscar_profesores') {
          textResponse =
            `Profesores encontrados en la base de datos:\n` +
            dbData.results
              .map(
                (p) =>
                  `- ${p.nombre}: Departamento de ${p.departamento || 'N/A'}, ${p.profesion || ''} (Email: ${p.email || 'N/A'})`
              )
              .join('\n');
        } else if (toolName === 'buscar_pokemons') {
          textResponse =
            `Pokemon encontrados en la base de datos:\n` +
            dbData.results
              .map((p) => `- ${p.name} (Tipo: ${p.type}, HP: ${p.hp || 'N/A'}, Habilidad: ${p.ability || 'N/A'})`)
              .join('\n');
        } else {
          textResponse =
            `Personajes encontrados en la base de datos:\n` +
            dbData.results
              .map((c) => `- ${c.name} (Grado: ${c.grade || 'N/A'}, Tecnica: ${c.technique || 'N/A'})`)
              .join('\n');
        }
        aiResult = {
          reply: textResponse,
          providerUsed: selectedProvider,
          modelUsed: 'system_database_fallback',
        };
      }

      const textResponse = aiResult.reply;

      return res.json({
        reply: textResponse,
        suggestions: knowledgeBase.getSuggestedQuestions().slice(0, 3),
        outOfScope: false,
        aiConsumed: true,
        provider: aiResult.providerUsed,
        model: aiResult.modelUsed,
        toolExecuted: toolName,
        timeoutSeconds: parsedTimeout,
      });
    } catch (err) {
      console.error(`[Chat-IA] Error en logica de chat (${selectedProvider}):`, err.message);
      return res.status(500).json({
        error: `Error al procesar consulta con ${selectedProvider}: ${err.message}`,
        reply: `Ocurrio un inconveniente con el proveedor ${selectedProvider} (${err.message}). Por favor intenta nuevamente o selecciona otro proveedor.`,
        provider: selectedProvider,
        timeoutSeconds: parsedTimeout,
      });
    }
  } catch (error) {
    console.error('[Chat-IA] Error interno:', error);
    res.status(500).json({
      error: 'Error interno en el servicio de Chat IA',
      details: error.message,
    });
  }
});

const server = app.listen(PORT, async () => {
  console.log(`[Chat-IA] Microservicio de IA ejecutandose en el puerto ${PORT}`);
  console.log(`[Chat-IA] Documentacion Swagger disponible en: http://localhost:${PORT}/api-docs`);

  // Consultar microservicios en segundo plano al arrancar
  knowledgeBase.syncFromMicroservices().catch((err) => {
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
