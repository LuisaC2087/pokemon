require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

let genAI = null;
if (GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 10) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY.trim());
    console.log(`[AI-Providers] Google Gemini inicializado (modelo base: ${GEMINI_MODEL})`);
  } catch (err) {
    console.error('[AI-Providers] Error al inicializar Gemini:', err.message);
  }
}

let groqClient = null;
if (GROQ_API_KEY && GROQ_API_KEY.trim().length > 5) {
  try {
    groqClient = new OpenAI({
      baseURL: GROQ_BASE_URL,
      apiKey: GROQ_API_KEY.trim(),
    });
    console.log(`[AI-Providers] Groq (Gratis) inicializado (modelo base: ${GROQ_MODEL})`);
  } catch (err) {
    console.error('[AI-Providers] Error al inicializar Groq:', err.message);
  }
}

let openaiClient = null;
if (OPENAI_API_KEY && OPENAI_API_KEY.trim().length > 5) {
  try {
    openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY.trim() });
    console.log(`[AI-Providers] OpenAI inicializado (modelo base: ${OPENAI_MODEL})`);
  } catch (err) {
    console.error('[AI-Providers] Error al inicializar OpenAI:', err.message);
  }
}

let deepseekClient = null;
if (DEEPSEEK_API_KEY && DEEPSEEK_API_KEY.trim().length > 5) {
  try {
    deepseekClient = new OpenAI({
      baseURL: DEEPSEEK_BASE_URL,
      apiKey: DEEPSEEK_API_KEY.trim(),
    });
    console.log(`[AI-Providers] DeepSeek inicializado (modelo base: ${DEEPSEEK_MODEL}, url: ${DEEPSEEK_BASE_URL})`);
  } catch (err) {
    console.error('[AI-Providers] Error al inicializar DeepSeek:', err.message);
  }
}

function stripEmojis(text) {
  if (!text) return '';
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}]/gu, '').trim();
}

function normalizeProvider(name) {
  if (!name || typeof name !== 'string') return 'gemini';
  const clean = name.toLowerCase().trim();
  if (clean.includes('groq') || clean.includes('llama')) return 'groq';
  if (clean.includes('open') || clean.includes('gpt')) return groqClient ? 'groq' : 'openai';
  if (clean.includes('deep')) return 'deepseek';
  if (clean.includes('gemini') || clean.includes('google')) return 'gemini';
  return clean;
}

function getProvidersStatus() {
  return [
    {
      id: 'gemini',
      name: 'Google Gemini (Gratis)',
      available: Boolean(genAI),
      model: GEMINI_MODEL,
      envKey: 'GEMINI_API_KEY',
    },
    {
      id: 'groq',
      name: 'Groq - Llama 3.3 (Gratis)',
      available: Boolean(groqClient),
      model: GROQ_MODEL,
      envKey: 'GROQ_API_KEY',
    },
    {
      id: 'openai',
      name: 'OpenAI (ChatGPT)',
      available: Boolean(openaiClient),
      model: OPENAI_MODEL,
      envKey: 'OPENAI_API_KEY',
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      available: Boolean(deepseekClient),
      model: DEEPSEEK_MODEL,
      envKey: 'DEEPSEEK_API_KEY',
    },
  ];
}

function isProviderConfigured(providerId) {
  const norm = normalizeProvider(providerId);
  if (norm === 'gemini') return Boolean(genAI);
  if (norm === 'groq') return Boolean(groqClient);
  if (norm === 'openai') return Boolean(openaiClient || groqClient);
  if (norm === 'deepseek') return Boolean(deepseekClient);
  return false;
}

/**
 * Planificador de herramientas usando el proveedor especificado (o fallback local)
 */
async function planToolWithProvider(providerId, trimmedMessage, timeoutMs = 15000) {
  const norm = normalizeProvider(providerId);
  const decisionPrompt = `Eres el orquestador de herramientas de la aplicacion.
Dado el mensaje del usuario, decide si requiere consultar alguno de los 3 microservicios:
- "buscar_profesores": si la pregunta es sobre profesores, docentes, departamento academico (ej: Sistemas, Matematicas, etc.), profesion o cuerpo docente.
- "buscar_pokemons": si la pregunta es sobre pokemons, sus caracteristicas, tipos, habilidades, o un pokemon en particular.
- "buscar_personajes_jujutsu": si la pregunta es sobre personajes de Jujutsu Kaisen, hechiceros, grados, tecnicas malditas o expansiones de dominio.
- "ninguna": si es un saludo, despedida, agradecimiento o una pregunta ajena a estos 3 temas.

Responde UNICAMENTE un objeto JSON valido con esta estructura exacta:
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

  try {
    if (norm === 'groq' && groqClient) {
      const response = await groqClient.chat.completions.create(
        {
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: 'Eres un orquestador que responde estrictamente en JSON.' },
            { role: 'user', content: decisionPrompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        },
        { timeout: timeoutMs }
      );
      const text = response.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(text);
      if (parsed && parsed.tool) return parsed;
    } else if (norm === 'openai' && (openaiClient || groqClient)) {
      const client = openaiClient || groqClient;
      const model = openaiClient ? OPENAI_MODEL : GROQ_MODEL;
      const response = await client.chat.completions.create(
        {
          model: model,
          messages: [
            { role: 'system', content: 'Eres un orquestador que responde estrictamente en JSON.' },
            { role: 'user', content: decisionPrompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        },
        { timeout: timeoutMs }
      );
      const text = response.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(text);
      if (parsed && parsed.tool) return parsed;
    } else if (norm === 'deepseek' && deepseekClient) {
      const response = await deepseekClient.chat.completions.create(
        {
          model: DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: 'Eres un orquestador que responde estrictamente en JSON.' },
            { role: 'user', content: decisionPrompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        },
        { timeout: timeoutMs }
      );
      const text = response.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(text);
      if (parsed && parsed.tool) return parsed;
    } else if (genAI) {
      const candidateModels = [GEMINI_MODEL, 'gemini-flash-lite-latest', 'gemini-flash-latest'];
      const activeModelName = candidateModels[0] || 'gemini-flash-lite-latest';
      const plannerModel = genAI.getGenerativeModel({
        model: activeModelName,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });
      const decisionRes = await plannerModel.generateContent(decisionPrompt);
      const parsed = JSON.parse(decisionRes.response.text());
      if (parsed && parsed.tool) return parsed;
    }
  } catch (err) {
    console.warn(`[AI-Providers] Error en planificador de herramientas con proveedor ${norm}:`, err.message);
  }

  // Fallback heuristico si la IA no respondio o fallo
  const lower = trimmedMessage.toLowerCase();
  if (
    lower.includes('profesor') ||
    lower.includes('docente') ||
    lower.includes('departamento') ||
    lower.includes('facultad') ||
    lower.includes('sistemas') ||
    lower.includes('materias')
  ) {
    let dep = null;
    if (lower.includes('sistema') || lower.includes('sistemas')) dep = 'Sistemas';
    else if (lower.includes('matematica') || lower.includes('matemáticas')) dep = 'Matematicas';
    else if (lower.includes('idioma') || lower.includes('idiomas')) dep = 'Idiomas';
    return {
      tool: 'buscar_profesores',
      args: { departamento: dep, termino: trimmedMessage, todos: lower.includes('todos') || lower.includes('cuales') },
    };
  } else if (
    lower.includes('pokemon') ||
    lower.includes('pikachu') ||
    lower.includes('charizard') ||
    lower.includes('bulbasaur') ||
    lower.includes('tipo')
  ) {
    return {
      tool: 'buscar_pokemons',
      args: { termino: trimmedMessage, todos: lower.includes('todos') },
    };
  } else if (
    lower.includes('jujutsu') ||
    lower.includes('gojo') ||
    lower.includes('itadori') ||
    lower.includes('sukuna') ||
    lower.includes('hechicero') ||
    lower.includes('grado')
  ) {
    return {
      tool: 'buscar_personajes_jujutsu',
      args: { termino: trimmedMessage, todos: lower.includes('todos') },
    };
  }

  return { tool: 'ninguna', args: {} };
}

/**
 * Genera la respuesta del asistente usando el proveedor seleccionado
 */
async function generateAssistantResponse({
  providerId,
  userMessage,
  instruction,
  history = [],
  timeoutMs = 40000,
}) {
  const norm = normalizeProvider(providerId);

  // Formatear historial para OpenAI / DeepSeek
  const standardMessages = [];
  standardMessages.push({ role: 'system', content: instruction });

  if (Array.isArray(history)) {
    history.slice(-4).forEach((h) => {
      if (h.role && h.content) {
        standardMessages.push({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: stripEmojis(h.content),
        });
      }
    });
  }

  standardMessages.push({
    role: 'user',
    content: userMessage,
  });

  // GROQ (100% GRATIS)
  if (norm === 'groq' || (norm === 'openai' && !openaiClient && groqClient)) {
    if (!groqClient) {
      throw new Error(
        'El proveedor Groq no esta configurado en el servidor. Por favor agregue GROQ_API_KEY en el archivo .env de microservices/chat-ia-node (es 100% gratuita en https://console.groq.com).'
      );
    }
    const response = await groqClient.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: standardMessages,
        temperature: 0.2,
        max_tokens: 800,
      },
      { timeout: timeoutMs }
    );
    const reply = response.choices?.[0]?.message?.content || '';
    return {
      reply: stripEmojis(reply),
      providerUsed: 'groq',
      modelUsed: GROQ_MODEL,
    };
  }

  // OPENAI
  if (norm === 'openai') {
    if (!openaiClient) {
      throw new Error(
        'El proveedor OpenAI no esta configurado en el servidor. Por favor agregue OPENAI_API_KEY en el archivo .env de microservices/chat-ia-node.'
      );
    }
    const response = await openaiClient.chat.completions.create(
      {
        model: OPENAI_MODEL,
        messages: standardMessages,
        temperature: 0.2,
        max_tokens: 800,
      },
      { timeout: timeoutMs }
    );
    const reply = response.choices?.[0]?.message?.content || '';
    return {
      reply: stripEmojis(reply),
      providerUsed: 'openai',
      modelUsed: OPENAI_MODEL,
    };
  }

  // DEEPSEEK
  if (norm === 'deepseek') {
    if (!deepseekClient) {
      throw new Error(
        'El proveedor DeepSeek no esta configurado en el servidor. Por favor agregue DEEPSEEK_API_KEY en el archivo .env de microservices/chat-ia-node.'
      );
    }
    const response = await deepseekClient.chat.completions.create(
      {
        model: DEEPSEEK_MODEL,
        messages: standardMessages,
        temperature: 0.2,
        max_tokens: 800,
      },
      { timeout: timeoutMs }
    );
    const reply = response.choices?.[0]?.message?.content || '';
    return {
      reply: stripEmojis(reply),
      providerUsed: 'deepseek',
      modelUsed: DEEPSEEK_MODEL,
    };
  }

  // GEMINI (Default)
  if (!genAI) {
    throw new Error(
      'El proveedor Google Gemini no esta configurado en el servidor. Por favor verifique GEMINI_API_KEY en el archivo .env.'
    );
  }

  const candidateModels = [
    GEMINI_MODEL,
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
  ].filter((val, idx, arr) => Boolean(val) && arr.indexOf(val) === idx);

  const contents = [];
  if (Array.isArray(history)) {
    history.slice(-4).forEach((h) => {
      if (h.role && h.content) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : h.role,
          parts: [{ text: stripEmojis(h.content) }],
        });
      }
    });
  }

  contents.push({
    role: 'user',
    parts: [{
      text: `Pregunta del usuario: "${userMessage}"\n\nContexto y estado del sistema:\n${instruction}`,
    }],
  });

  let lastGeminiError = null;
  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 800,
        },
      });

      const result = await model.generateContent({ contents });
      const textResponse = stripEmojis(result.response.text());
      return {
        reply: textResponse,
        providerUsed: 'gemini',
        modelUsed: modelName,
      };
    } catch (err) {
      lastGeminiError = err;
      console.warn(`[AI-Providers] Gemini modelo ${modelName} fallo (${err.message}). Probando alternativo...`);
    }
  }

  throw lastGeminiError || new Error('No se pudo generar respuesta con Google Gemini');
}

module.exports = {
  stripEmojis,
  normalizeProvider,
  getProvidersStatus,
  isProviderConfigured,
  planToolWithProvider,
  generateAssistantResponse,
  GEMINI_MODEL,
  GROQ_MODEL,
  OPENAI_MODEL,
  DEEPSEEK_MODEL,
};
