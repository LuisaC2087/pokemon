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

  async fetchLiveProfesores() {
    try {
      const res = await fetch(`${PROFESORES_BASE_URL}/profesores`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          this.profesores = data;
          this.serviceErrors.profesores = null;
        }
      }
    } catch (e) {
      console.warn('[KnowledgeBase] Error en consulta en vivo a Profesores:', e.message);
    }
    return this.profesores;
  }

  async fetchLivePokemons() {
    try {
      const res = await fetch(`${POKEMON_BASE_URL}/pokemons`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          this.pokemons = data;
          this.serviceErrors.pokemon = null;
        }
      }
    } catch (e) {
      console.warn('[KnowledgeBase] Error en consulta en vivo a Pokemon:', e.message);
    }
    return this.pokemons;
  }

  async fetchLiveJujutsu() {
    try {
      const res = await fetch(`${JUJUTSU_BASE_URL}/characters`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          this.characters = data;
          this.serviceErrors.jujutsu = null;
        }
      }
    } catch (e) {
      console.warn('[KnowledgeBase] Error en consulta en vivo a Jujutsu:', e.message);
    }
    return this.characters;
  }

  async buscarProfesores({ departamento, nombre, profesion, termino, todos } = {}) {
    const list = await this.fetchLiveProfesores();
    if (!list || list.length === 0) {
      return { found: false, count: 0, totalInDb: 0, results: [], emptyDb: true };
    }

    if (todos) {
      return { found: true, count: list.length, totalInDb: list.length, results: list, emptyDb: false };
    }

    const depQ = (departamento || '').toLowerCase().trim();
    const nomQ = (nombre || '').toLowerCase().trim();
    const profQ = (profesion || '').toLowerCase().trim();
    const termQ = (termino || '').toLowerCase().trim();

    // Si no se pasaron filtros específicos, retornar todos los registrados
    if (!depQ && !nomQ && !profQ && !termQ) {
      return { found: true, count: list.length, totalInDb: list.length, results: list, emptyDb: false };
    }

    const filtered = list.filter((p) => {
      const pDep = (p.departamento || '').toLowerCase();
      const pNom = (p.nombre || '').toLowerCase();
      const pProf = (p.profesion || '').toLowerCase();

      if (depQ && pDep.includes(depQ)) return true;
      if (nomQ && pNom.includes(nomQ)) return true;
      if (profQ && pProf.includes(profQ)) return true;
      if (termQ && (pDep.includes(termQ) || pNom.includes(termQ) || pProf.includes(termQ))) return true;
      return false;
    });

    return {
      found: filtered.length > 0,
      count: filtered.length,
      totalInDb: list.length,
      results: filtered,
      emptyDb: false,
    };
  }

  async buscarPokemons({ nombre, tipo, id, termino, todos } = {}) {
    const list = await this.fetchLivePokemons();
    if (!list || list.length === 0) {
      return { found: false, count: 0, totalInDb: 0, results: [], emptyDb: true };
    }

    if (todos) {
      return { found: true, count: list.length, totalInDb: list.length, results: list, emptyDb: false };
    }

    const nomQ = (nombre || '').toLowerCase().trim();
    const tipoQ = (tipo || '').toLowerCase().trim();
    const termQ = (termino || '').toLowerCase().trim();
    const idQ = id !== undefined && id !== null ? String(id).trim() : '';

    if (!nomQ && !tipoQ && !termQ && !idQ) {
      return { found: true, count: list.length, totalInDb: list.length, results: list, emptyDb: false };
    }

    const filtered = list.filter((p) => {
      const pNom = (p.name || '').toLowerCase();
      const pTipo = (p.type || '').toLowerCase();
      const pId = String(p.id || '');

      if (idQ && pId === idQ) return true;
      if (nomQ && pNom.includes(nomQ)) return true;
      if (tipoQ && pTipo.includes(tipoQ)) return true;
      if (termQ && (pNom.includes(termQ) || pTipo.includes(termQ) || pId === termQ)) return true;
      return false;
    });

    return {
      found: filtered.length > 0,
      count: filtered.length,
      totalInDb: list.length,
      results: filtered,
      emptyDb: false,
    };
  }

  async buscarPersonajesJujutsu({ nombre, grado, tecnica, termino, todos } = {}) {
    const list = await this.fetchLiveJujutsu();
    if (!list || list.length === 0) {
      return { found: false, count: 0, totalInDb: 0, results: [], emptyDb: true };
    }

    if (todos) {
      return { found: true, count: list.length, totalInDb: list.length, results: list, emptyDb: false };
    }

    const nomQ = (nombre || '').toLowerCase().trim();
    const gradoQ = (grado || '').toLowerCase().trim();
    const tecQ = (tecnica || '').toLowerCase().trim();
    const termQ = (termino || '').toLowerCase().trim();

    if (!nomQ && !gradoQ && !tecQ && !termQ) {
      return { found: true, count: list.length, totalInDb: list.length, results: list, emptyDb: false };
    }

    const filtered = list.filter((c) => {
      const cNom = (c.name || '').toLowerCase();
      const cGrado = (c.grade || '').toLowerCase();
      const cTec = (c.technique || '').toLowerCase();

      if (nomQ && cNom.includes(nomQ)) return true;
      if (gradoQ && cGrado.includes(gradoQ)) return true;
      if (tecQ && cTec.includes(tecQ)) return true;
      if (termQ && (cNom.includes(termQ) || cGrado.includes(termQ) || cTec.includes(termQ))) return true;
      return false;
    });

    return {
      found: filtered.length > 0,
      count: filtered.length,
      totalInDb: list.length,
      results: filtered,
      emptyDb: false,
    };
  }

  /**
   * Valida rigurosamente si la pregunta del usuario hace referencia a alguno de los personajes
   * de los 3 microservicios (Pokemon, Anime Jujutsu Kaisen o Profesores).
   * 
   * Retorna { valid: true, toolName, dbData, category } si hace referencia y se hallan registros.
   * Retorna { valid: false, reply, reason } si no hace referencia o no existe en la BD.
   */
  async validarReferenciaPersonajes(message) {
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return {
        valid: false,
        reply: 'No es posible procesar un mensaje vacio.',
        reason: 'empty_message',
      };
    }

    const raw = message.trim();
    // Normalizar texto eliminando tildes y a minúsculas
    const norm = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Cargar datos en vivo de los microservicios
    const [pokes, jujutsus, profs] = await Promise.all([
      this.fetchLivePokemons(),
      this.fetchLiveJujutsu(),
      this.fetchLiveProfesores(),
    ]);

    // 1. Verificar si hace referencia a POKÉMON
    const pokeKeywords = [
      'pokemon', 'pokemons', 'pokedex', 'pikachu', 'charizard', 'bulbasaur', 'squirtle',
      'tipo electrico', 'tipo fuego', 'tipo agua', 'tipo planta', 'tipo veneno'
    ];
    const refersToPokemonKeyword = pokeKeywords.some((kw) => norm.includes(kw));

    let matchedPokemon = null;
    if (Array.isArray(pokes)) {
      matchedPokemon = pokes.find((p) => {
        const pNorm = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return pNorm.length >= 3 && norm.includes(pNorm);
      });
    }

    if (refersToPokemonKeyword || matchedPokemon) {
      const dbData = await this.buscarPokemons({
        nombre: matchedPokemon ? matchedPokemon.name : undefined,
        termino: raw,
        todos: norm.includes('todos') || norm.includes('cuales') || norm.includes('listar'),
      });

      if (dbData && dbData.found && dbData.results.length > 0) {
        return {
          valid: true,
          toolName: 'buscar_pokemons',
          dbData,
          category: 'pokemon',
        };
      } else {
        return {
          valid: false,
          reply: 'No es posible responder a tu consulta. El personaje o Pokémon consultado no se encuentra registrado en el microservicio oficial.',
          reason: 'pokemon_not_found',
        };
      }
    }

    // 2. Verificar si hace referencia a ANIME (JUJUTSU KAISEN)
    const animeKeywords = [
      'jujutsu', 'kaisen', 'hechicero', 'hechiceros', 'maldicion', 'maldiciones',
      'tecnica maldita', 'expansion de dominio', 'anime', 'gojo', 'itadori', 'sukuna',
      'megumi', 'nobara', 'nanami', 'satoru', 'yuji'
    ];
    const refersToAnimeKeyword = animeKeywords.some((kw) => norm.includes(kw));

    let matchedJujutsu = null;
    if (Array.isArray(jujutsus)) {
      matchedJujutsu = jujutsus.find((c) => {
        const cNorm = (c.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const parts = cNorm.split(' ');
        return parts.some((part) => part.length >= 3 && norm.includes(part));
      });
    }

    if (refersToAnimeKeyword || matchedJujutsu) {
      const dbData = await this.buscarPersonajesJujutsu({
        nombre: matchedJujutsu ? matchedJujutsu.name : undefined,
        termino: raw,
        todos: norm.includes('todos') || norm.includes('cuales') || norm.includes('listar'),
      });

      if (dbData && dbData.found && dbData.results.length > 0) {
        return {
          valid: true,
          toolName: 'buscar_personajes_jujutsu',
          dbData,
          category: 'jujutsu',
        };
      } else {
        return {
          valid: false,
          reply: 'No es posible responder a tu consulta. El personaje de anime (Jujutsu Kaisen) consultado no se encuentra registrado en el microservicio oficial.',
          reason: 'anime_character_not_found',
        };
      }
    }

    // 3. Verificar si hace referencia a PROFESORES
    const profKeywords = [
      'profesor', 'profesora', 'profesores', 'docente', 'docentes',
      'departamento', 'catedra', 'materia', 'facultad', 'asignatura'
    ];
    const refersToProfKeyword = profKeywords.some((kw) => norm.includes(kw));

    let matchedProf = null;
    if (Array.isArray(profs)) {
      matchedProf = profs.find((p) => {
        const pNorm = (p.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const parts = pNorm.split(' ');
        return parts.some((part) => part.length >= 3 && norm.includes(part));
      });
    }

    if (refersToProfKeyword || matchedProf) {
      let dep = null;
      if (norm.includes('sistema') || norm.includes('sistemas')) dep = 'Sistemas';
      else if (norm.includes('matematica') || norm.includes('matematicas')) dep = 'Matematicas';
      else if (norm.includes('idioma') || norm.includes('idiomas')) dep = 'Idiomas';

      const dbData = await this.buscarProfesores({
        departamento: dep,
        nombre: matchedProf ? matchedProf.nombre : undefined,
        termino: raw,
        todos: norm.includes('todos') || norm.includes('cuales') || norm.includes('listar'),
      });

      if (dbData && dbData.found && dbData.results.length > 0) {
        return {
          valid: true,
          toolName: 'buscar_profesores',
          dbData,
          category: 'profesores',
        };
      } else {
        return {
          valid: false,
          reply: 'No es posible responder a tu consulta. El docente o profesor consultado no se encuentra registrado en el microservicio oficial.',
          reason: 'profesor_not_found',
        };
      }
    }

    // 4. Si la pregunta NO hace referencia a ninguno de los 3 microservicios
    return {
      valid: false,
      reply: 'No es posible responder a tu consulta. Solo puedo responder preguntas que hagan referencia a los personajes y registros de los microservicios de Pokémon, Anime (Jujutsu Kaisen) o Profesores.',
      reason: 'out_of_scope',
    };
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
