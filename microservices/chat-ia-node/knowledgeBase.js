/**
 * Base de conocimiento dinamica conectada a los 3 microservicios:
 * 1. Pokemon (PostgreSQL / pokemon-node)
 * 2. Jujutsu Kaisen (MongoDB Atlas / anime-python)
 * 3. Profesores (Supabase PostgreSQL / profesores-node)
 * 
 * NOTA: No contiene datos hardcodeados ni motores de respuesta locales.
 * Solo sincroniza datos desde los microservicios para alimentar el contexto de Gemini AI.
 */

const POKEMON_BASE_URL = process.env.POKEMON_SERVICE_URL || 'https://pokemon-node-ueas.onrender.com';
const JUJUTSU_BASE_URL = process.env.JUJUTSU_SERVICE_URL || 'https://anime-python-ueas.onrender.com';
const PROFESORES_BASE_URL = process.env.PROFESORES_SERVICE_URL || 'https://profesores-node-ueas.onrender.com';

// Tiempo de espera para microservicios alojados en Render (permite cold starts)
const FETCH_TIMEOUT_MS = 25000;

class KnowledgeBase {
  constructor() {
    this.pokemons = [];
    this.characters = [];
    this.profesores = [];
    this.lastSync = null;
    this.serviceErrors = {
      pokemon: null,
      jujutsu: null,
      profesores: null,
    };
  }

  async syncFromMicroservices() {
    console.log('[KnowledgeBase] Consultando datos desde los microservicios...');

    // 1. Pokemon
    try {
      const res = await fetch(`${POKEMON_BASE_URL}/pokemons`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          this.pokemons = data;
          this.serviceErrors.pokemon = null;
          console.log(`[KnowledgeBase] Pokemon cargados: ${this.pokemons.length}`);
        } else {
          this.serviceErrors.pokemon = 'Respuesta inesperada del microservicio Pokemon';
        }
      } else {
        this.serviceErrors.pokemon = `Error HTTP ${res.status} al consultar pokemon-node`;
      }
    } catch (err) {
      this.serviceErrors.pokemon = `No se pudo conectar con el microservicio Pokemon: ${err.message}`;
      console.warn('[KnowledgeBase]', this.serviceErrors.pokemon);
    }

    // 2. Jujutsu Kaisen
    try {
      const res = await fetch(`${JUJUTSU_BASE_URL}/characters`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          this.characters = data;
          this.serviceErrors.jujutsu = null;
          console.log(`[KnowledgeBase] Personajes de Jujutsu cargados: ${this.characters.length}`);
        } else {
          this.serviceErrors.jujutsu = 'Respuesta inesperada del microservicio Jujutsu Kaisen';
        }
      } else {
        this.serviceErrors.jujutsu = `Error HTTP ${res.status} al consultar anime-python`;
      }
    } catch (err) {
      this.serviceErrors.jujutsu = `No se pudo conectar con el microservicio Jujutsu Kaisen: ${err.message}`;
      console.warn('[KnowledgeBase]', this.serviceErrors.jujutsu);
    }

    // 3. Profesores
    try {
      const res = await fetch(`${PROFESORES_BASE_URL}/profesores`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          this.profesores = data;
          this.serviceErrors.profesores = null;
          console.log(`[KnowledgeBase] Profesores cargados: ${this.profesores.length}`);
        } else {
          this.serviceErrors.profesores = 'Respuesta inesperada del microservicio Profesores';
        }
      } else {
        this.serviceErrors.profesores = `Error HTTP ${res.status} al consultar profesores-node`;
      }
    } catch (err) {
      this.serviceErrors.profesores = `No se pudo conectar con el microservicio Profesores: ${err.message}`;
      console.warn('[KnowledgeBase]', this.serviceErrors.profesores);
    }

    this.lastSync = new Date();
  }

  getSuggestedQuestions() {
    const suggestions = [];

    if (this.pokemons.length > 0) {
      suggestions.push(`Cuales son las caracteristicas y tipo de ${this.pokemons[0].name}?`);
    } else {
      suggestions.push('Que informacion de Pokemon hay registrada?');
    }

    if (this.characters.length > 0) {
      suggestions.push(`Cual es la tecnica maldita de ${this.characters[0].name}?`);
    } else {
      suggestions.push('Que personajes de Jujutsu Kaisen estan disponibles?');
    }

    if (this.profesores.length > 0) {
      suggestions.push(`A que departamento pertenece ${this.profesores[0].nombre}?`);
    } else {
      suggestions.push('Cuales profesores estan registrados en el sistema?');
    }

    return suggestions;
  }

  buildSystemPrompt() {
    let pokemonSection = 'Base de datos de Pokemon: No hay registros disponibles en este momento o el microservicio esta desconectado.';
    if (this.pokemons.length > 0) {
      pokemonSection = 'Base de datos de Pokemon (registros actuales del microservicio):\n' + this.pokemons.map(p => 
        `- ${p.name} (ID: ${p.id}): Tipo: ${p.type}, Habilidad: ${p.ability || 'N/A'}, HP: ${p.hp || 'N/A'}, Altura: ${p.height || 'N/A'}, Peso: ${p.weight || 'N/A'}`
      ).join('\n');
    }

    let jujutsuSection = 'Base de datos de Jujutsu Kaisen: No hay registros disponibles en este momento o el microservicio esta desconectado.';
    if (this.characters.length > 0) {
      jujutsuSection = 'Base de datos de Jujutsu Kaisen (registros actuales del microservicio):\n' + this.characters.map(c => 
        `- ${c.name}: Grado: ${c.grade || 'N/A'}, Tecnica: ${c.technique || 'N/A'}, Expansion: ${c.domain_expansion || 'N/A'}, Anime: ${c.anime || 'Jujutsu Kaisen'}`
      ).join('\n');
    }

    let profesoresSection = 'Base de datos de Profesores: No hay registros disponibles en este momento o el microservicio esta desconectado.';
    if (this.profesores.length > 0) {
      profesoresSection = 'Base de datos de Profesores (registros actuales del microservicio):\n' + this.profesores.map(p => 
        `- ${p.nombre}: Departamento: ${p.departamento || 'N/A'}, Profesion: ${p.profesion || 'N/A'}, Email: ${p.email || 'N/A'}, Telefono: ${p.telefono || 'N/A'}`
      ).join('\n');
    }

    return `
Eres el Asistente de Inteligencia Artificial Oficial de la aplicacion.
Tu mision es responder preguntas basada EXCLUSIVAMENTE en la informacion presente en los 3 microservicios.
NO USES NINGUN EMOJI EN TUS RESPUESTAS. ESTA ESTRICTAMENTE PROHIBIDO USAR CUALQUIER EMOJI O ICONO GRAFICO.

DATOS OFICIALES DE LOS MICROSERVICIOS:
${pokemonSection}

${jujutsuSection}

${profesoresSection}

REGLAS ESTRICTAS DE CONOCIMIENTO Y COMPORTAMIENTO:
1. Solo tienes permitido responder consultas cuya respuesta este explícitamente contenida en la informacion de los microservicios mostrada arriba.
2. Si el usuario pregunta cualquier cosa fuera de estas bases de datos (otros temas, celebridades, recetas, politica, deportes, peliculas, matematicas externas, animes diferentes o datos ajenos):
   - TIENES ESTRICTAMENTE PROHIBIDO responder la consulta externa o inventar informacion.
   - DEBES rechazar la pregunta informando con amabilidad que tu conocimiento esta limitado estrictamente a la base de datos de los microservicios de Pokemon, Jujutsu Kaisen y Profesores.
   - DEBES indicar que preguntas sugiere hacerte en base a la informacion disponible.
3. Si el microservicio de algun tema no tiene registros cargados y el usuario pregunta por ese tema:
   - Informa al usuario que la base de datos o el microservicio de ese tema no se encuentra disponible actualmente.
4. Responde de forma clara, concisa, profesional y siempre sin emojis.
`.trim();
  }
}

module.exports = new KnowledgeBase();
