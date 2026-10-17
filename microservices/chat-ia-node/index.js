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
      const candidateModels = [
        GEMINI_MODEL,
        'gemini-flash-lite-latest',
        'gemini-flash-latest',
      ].filter((val, idx, arr) => Boolean(val) && arr.indexOf(val) === idx);

      const activeModelName = candidateModels[0] || 'gemini-flash-lite-latest';
      const plannerModel = genAI.getGenerativeModel({
        model: activeModelName,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        }
      });

      // PASO 1 Y 2: El modelo solicita o determina ejecutar la herramienta correspondiente
      let toolDecision = { tool: 'ninguna', args: {} };
      try {
        const decisionPrompt = `Eres el orquestador de herramientas de la aplicacion.
Dado el mensaje del usuario y el historial previo, decide si requiere consultar alguno de los 3 microservicios:
- "buscar_profesores": si la pregunta es sobre profesores, docentes, departamento academico (ej: Sistemas, Matematicas, etc.), profesion o cuerpo docente.
- "buscar_pokemons": si la pregunta es sobre pokemons, sus caracteristicas, tipos, habilidades, o un pokemon en particular.
- "buscar_personajes_jujutsu": si la pregunta es sobre personajes de Jujutsu Kaisen, hechiceros, grados, tecnicas malditas o expansiones de dominio.
- "ninguna": si es un saludo, despedida, agradecimiento o una pregunta ajena a estos 3 temas.

Responde UNICAMENTE un JSON con este formato:
{
  "tool": "buscar_profesores" | "buscar_pokemons" | "buscar_personajes_jujutsu" | "ninguna",
  "args": {
    "departamento": string o null,
    "nombre": string o null,
    "profesion": string o null,
    "tipo": string o null,
    "grado": string o null,
    "tecnica": string o null,
    "termino": string o null,
    "todos": boolean
  }
}

Mensaje del usuario: "${trimmedMessage}"`;

        const decisionRes = await plannerModel.generateContent(decisionPrompt);
        const parsed = JSON.parse(decisionRes.response.text());
        if (parsed && parsed.tool) {
          toolDecision = parsed;
        }
      } catch (err) {
        console.warn('[Chat-IA] Planificador automatico de herramientas con fallo leve, usando analizador de respaldo:', err.message);
        const lower = trimmedMessage.toLowerCase();
        if (lower.includes('profesor') || lower.includes('docente') || lower.includes('departamento') || lower.includes('facultad') || lower.includes('sistemas') || lower.includes('materias')) {
          let dep = null;
          if (lower.includes('sistema') || lower.includes('sistemas')) dep = 'Sistemas';
          else if (lower.includes('matematica') || lower.includes('matemáticas')) dep = 'Matematicas';
          else if (lower.includes('idioma') || lower.includes('idiomas')) dep = 'Idiomas';
          toolDecision = { tool: 'buscar_profesores', args: { departamento: dep, termino: trimmedMessage, todos: lower.includes('todos') || lower.includes('cuales') } };
        } else if (lower.includes('pokemon') || lower.includes('pikachu') || lower.includes('charizard') || lower.includes('bulbasaur') || lower.includes('tipo')) {
          toolDecision = { tool: 'buscar_pokemons', args: { termino: trimmedMessage, todos: lower.includes('todos') } };
        } else if (lower.includes('jujutsu') || lower.includes('gojo') || lower.includes('itadori') || lower.includes('sukuna') || lower.includes('hechicero') || lower.includes('grado')) {
          toolDecision = { tool: 'buscar_personajes_jujutsu', args: { termino: trimmedMessage, todos: lower.includes('todos') } };
        }
      }

      console.log(`[Chat-IA] Herramienta seleccionada: ${toolDecision.tool}`, toolDecision.args);

      // PASO 3 Y 4: El backend valida los argumentos y consulta el microservicio en tiempo real
      let dbData = null;
      let toolName = toolDecision.tool;

      if (toolName === 'buscar_profesores') {
        dbData = await knowledgeBase.buscarProfesores(toolDecision.args || {});
      } else if (toolName === 'buscar_pokemons') {
        dbData = await knowledgeBase.buscarPokemons(toolDecision.args || {});
      } else if (toolName === 'buscar_personajes_jujutsu') {
        dbData = await knowledgeBase.buscarPersonajesJujutsu(toolDecision.args || {});
      }

      // PASO 5 Y 6: Enviar resultados al modelo para formular la respuesta
      // Si no existen resultados pertinentes, informar que no esta disponible sin improvisar
      let instructionForGemini = '';

      if (dbData) {
        if (!dbData.found || dbData.results.length === 0) {
          // PASO 6: No existen resultados pertinentes en la base de datos
          instructionForGemini = `
Se consulto la base de datos oficial del microservicio en tiempo real para la herramienta "${toolName}".
RESULTADO DE LA BASE DE DATOS: 0 registros encontrados (informacion no disponible en la base de datos actual).
REGLA OBLIGATORIA:
- Informa de manera respetuosa, clara y profesional que la informacion solicitada no se encuentra registrada en la base de datos de los microservicios.
- TIENES ESTRICTAMENTE PROHIBIDO improvisar, inventar datos o asumir nombres.
- Sugiere amablemente que consultas pertinentes si se pueden realizar sobre los microservicios del sistema.
- NO uses ningun emoji.
`.trim();
        } else {
          // PASO 5: Si existen resultados, enviar los registros para que formule la respuesta y la enriquezca
          instructionForGemini = `
Se consulto la base de datos oficial del microservicio en tiempo real para la herramienta "${toolName}".
REGISTROS OFICIALES ENCONTRADOS (${dbData.results.length} registros verificados en la base de datos):
${JSON.stringify(dbData.results, null, 2)}

INSTRUCCION:
- Formula una respuesta completa, util y profesional basada en estos registros encontrados en la base de datos.
- Puedes mejorar y enriquecer la respuesta explicando con claridad los detalles de los elementos encontrados.
- Manten la fidelidad a los datos provistos por el microservicio.
- NO uses ningun emoji en tu respuesta.
`.trim();
        }
      } else {
        // Consulta general o fuera de los 3 microservicios
        instructionForGemini = `
Eres el Asistente Oficial de la aplicacion, limitado exclusivamente a los microservicios de Pokemon, Jujutsu Kaisen y Profesores.
- Si el usuario saluda o pregunta en que puedes ayudarlo, responde cordialmente indicando que puedes consultar los microservicios de Pokemon, Jujutsu Kaisen y Profesores universitarios.
- Si la pregunta es sobre cualquier otro tema ajeno a estos 3 microservicios, informa con amabilidad que no puedes responder temas externos y sugiere que preguntas validas puede hacer.
- NO uses ningun emoji.
`.trim();
      }

      const contents = [];
      if (Array.isArray(history)) {
        history.slice(-4).forEach(h => {
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
        parts: [{
          text: `Pregunta del usuario: "${trimmedMessage}"\n\nContexto y estado del sistema:\n${instructionForGemini}`
        }]
      });

      let textResponse = null;

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 800,
            }
          });

          const result = await model.generateContent({ contents });
          textResponse = stripEmojis(result.response.text());
          break;
        } catch (err) {
          console.warn(`[Chat-IA] Modelo ${modelName} no pudo responder (${err.message}). Intentando siguiente...`);
        }
      }

      // Si todos los modelos de Gemini fallaron o no estan disponibles, respuesta garantizada
      if (!textResponse) {
        if (dbData && dbData.found && dbData.results.length > 0) {
          if (toolName === 'buscar_profesores') {
            textResponse = `Profesores encontrados en la base de datos:\n` +
              dbData.results.map(p => `- ${p.nombre}: Departamento de ${p.departamento || 'N/A'}, ${p.profesion || ''} (Email: ${p.email || 'N/A'})`).join('\n');
          } else if (toolName === 'buscar_pokemons') {
            textResponse = `Pokemon encontrados en la base de datos:\n` +
              dbData.results.map(p => `- ${p.name} (Tipo: ${p.type}, HP: ${p.hp || 'N/A'}, Habilidad: ${p.ability || 'N/A'})`).join('\n');
          } else {
            textResponse = `Personajes encontrados en la base de datos:\n` +
              dbData.results.map(c => `- ${c.name} (Grado: ${c.grade || 'N/A'}, Tecnica: ${c.technique || 'N/A'})`).join('\n');
          }
        } else if (dbData && !dbData.found) {
          textResponse = 'La informacion solicitada no se encuentra disponible actualmente en la base de datos del microservicio. Por politicas de precision, no puedo improvisar datos ni inventar registros.';
        } else {
          textResponse = 'Solo puedo responder consultas basadas en los microservicios de Pokemon, Jujutsu Kaisen y Profesores. Puedes consultarme por cualquiera de ellos.';
        }
      }

      const outOfScope = textResponse.toLowerCase().includes('fuera de') || 
                         textResponse.toLowerCase().includes('solo tengo acceso') ||
                         textResponse.toLowerCase().includes('no se encuentra disponible') ||
                         textResponse.toLowerCase().includes('no puedo responder');

      return res.json({
        reply: textResponse,
        suggestions: knowledgeBase.getSuggestedQuestions().slice(0, 3),
        outOfScope,
        provider: 'gemini',
        toolExecuted: toolName
      });
    } catch (err) {
      console.error('[Chat-IA] Error inesperado en /chat:', err.message);
      return res.status(500).json({
        error: 'Error interno en el servicio de chat',
        reply: 'Ocurrio un inconveniente al procesar la solicitud. Por favor intenta nuevamente.',
        details: err.message
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
