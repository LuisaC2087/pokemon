/**
 * Base de conocimiento dinamica conectada a los 3 microservicios:
 * 1. Pokemon (PostgreSQL / pokemon-node)
 * 2. Jujutsu Kaisen (MongoDB Atlas / anime-python)
 * 3. Profesores (Supabase PostgreSQL / profesores-node)
 *
 */

const POKEMON_BASE_URL = process.env.POKEMON_SERVICE_URL || 'https://pokemon-node-ueas.onrender.com';
const JUJUTSU_BASE_URL = process.env.JUJUTSU_SERVICE_URL || 'https://anime-python-ueas.onrender.com';
const PROFESORES_BASE_URL = process.env.PROFESORES_SERVICE_URL || 'https://profesores-node-ueas.onrender.com';

// Tiempo de espera para microservicios alojados en Render (permite cold starts)
const FETCH_TIMEOUT_MS = 25000;

// TTL de cache en ms (datos estaticos 60s, profesores 30s por ser dinamicos)
const CACHE_TTL_STATIC_MS = 60 * 1000;
const CACHE_TTL_DYNAMIC_MS = 30 * 1000;

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
    // Cache TTL: guarda el timestamp de expiracion por servicio
    this._cacheExpiry = {
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
          this._cacheExpiry.pokemon = Date.now() + CACHE_TTL_STATIC_MS;
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
          this._cacheExpiry.jujutsu = Date.now() + CACHE_TTL_STATIC_MS;
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
          this._cacheExpiry.profesores = Date.now() + CACHE_TTL_DYNAMIC_MS;
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

  // ── Fetch con caché TTL ──────────────────────────────────────────────────

  async fetchLiveProfesores() {
    const now = Date.now();
    if (this.profesores.length > 0 && this._cacheExpiry.profesores && now < this._cacheExpiry.profesores) {
      return this.profesores;
    }
    try {
      const res = await fetch(`${PROFESORES_BASE_URL}/profesores`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          this.profesores = data;
          this._cacheExpiry.profesores = now + CACHE_TTL_DYNAMIC_MS;
          this.serviceErrors.profesores = null;
        }
      }
    } catch (e) {
      console.warn('[KnowledgeBase] Error en consulta en vivo a Profesores:', e.message);
    }
    return this.profesores;
  }

  async fetchLivePokemons() {
    const now = Date.now();
    if (this.pokemons.length > 0 && this._cacheExpiry.pokemon && now < this._cacheExpiry.pokemon) {
      return this.pokemons;
    }
    try {
      const res = await fetch(`${POKEMON_BASE_URL}/pokemons`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          this.pokemons = data;
          this._cacheExpiry.pokemon = now + CACHE_TTL_STATIC_MS;
          this.serviceErrors.pokemon = null;
        }
      }
    } catch (e) {
      console.warn('[KnowledgeBase] Error en consulta en vivo a Pokemon:', e.message);
    }
    return this.pokemons;
  }

  async fetchLiveJujutsu() {
    const now = Date.now();
    if (this.characters.length > 0 && this._cacheExpiry.jujutsu && now < this._cacheExpiry.jujutsu) {
      return this.characters;
    }
    try {
      const res = await fetch(`${JUJUTSU_BASE_URL}/characters`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          this.characters = data;
          this._cacheExpiry.jujutsu = now + CACHE_TTL_STATIC_MS;
          this.serviceErrors.jujutsu = null;
        }
      }
    } catch (e) {
      console.warn('[KnowledgeBase] Error en consulta en vivo a Jujutsu:', e.message);
    }
    return this.characters;
  }

  // ── Filtrado local (sin re-fetch) ─────────────────────────────────────────

  _filtrarProfesores(list, { departamento, nombre, profesion, termino, todos } = {}) {
    if (!list || list.length === 0) {
      return { found: false, count: 0, totalInDb: 0, results: [], emptyDb: true };
    }
    if (todos) {
      return { found: true, count: list.length, totalInDb: list.length, results: list, emptyDb: false };
    }

    const depQ = (departamento || '').toLowerCase().trim();
    const nomQ = (nombre || '').toLowerCase().trim();
    const profQ = (profesion || '').toLowerCase().trim();
    const termQ = (termino || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    if (!depQ && !nomQ && !profQ && !termQ) {
      return { found: true, count: list.length, totalInDb: list.length, results: list, emptyDb: false };
    }

    const filtered = list.filter((p) => {
      const pDep = (p.departamento || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const pNom = (p.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const pProf = (p.profesion || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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

  _filtrarPokemons(list, { nombre, tipo, id, termino, todos } = {}) {
    if (!list || list.length === 0) {
      return { found: false, count: 0, totalInDb: 0, results: [], emptyDb: true };
    }
    if (todos) {
      return { found: true, count: list.length, totalInDb: list.length, results: list, emptyDb: false };
    }

    const nomQ = (nombre || '').toLowerCase().trim();
    const tipoQ = (tipo || '').toLowerCase().trim();
    const termQ = (termino || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
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

  _filtrarJujutsu(list, { nombre, grado, tecnica, termino, todos } = {}) {
    if (!list || list.length === 0) {
      return { found: false, count: 0, totalInDb: 0, results: [], emptyDb: true };
    }
    if (todos) {
      return { found: true, count: list.length, totalInDb: list.length, results: list, emptyDb: false };
    }

    const nomQ = (nombre || '').toLowerCase().trim();
    const gradoQ = (grado || '').toLowerCase().trim();
    const tecQ = (tecnica || '').toLowerCase().trim();
    const termQ = (termino || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

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

  // ── Métodos públicos buscar* (para compatibilidad con código externo) ──────

  async buscarProfesores(opts) {
    const list = await this.fetchLiveProfesores();
    return this._filtrarProfesores(list, opts);
  }

  async buscarPokemons(opts) {
    const list = await this.fetchLivePokemons();
    return this._filtrarPokemons(list, opts);
  }

  async buscarPersonajesJujutsu(opts) {
    const list = await this.fetchLiveJujutsu();
    return this._filtrarJujutsu(list, opts);
  }

  /**
   * Verifica si el mensaje es un saludo inicial
   */
  _isGreeting(norm) {
    if (!norm) return false;
    const clean = norm
      .replace(/[¿?¡!.,;:()_/\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const greetingPhrases = [
      'hola', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches',
      'que tal', 'saludos', 'hey', 'hello', 'hi', 'que hay', 'como estas', 'como te va',
      'quien eres', 'que haces', 'que eres', 'que puedes hacer', 'ayuda', 'inicio', 'empezar'
    ];

    if (greetingPhrases.includes(clean)) return true;

    const words = clean.split(' ');
    if (words.length <= 4 && ['hola', 'buenas', 'hey', 'saludos', 'hello', 'hi'].includes(words[0])) {
      return true;
    }
    return false;
  }

  /**
   * Valida si la pregunta del usuario hace referencia a alguno de los personajes
   * de los 3 microservicios (Pokemon, Jujutsu Kaisen o Profesores) o es un saludo inicial.
   *
   * Soporta saludos iniciales y preguntas de seguimiento usando el historial.
   */
  async validarReferenciaPersonajes(message, history = []) {
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return {
        valid: false,
        reply: 'No es posible procesar un mensaje vacio.',
        reason: 'empty_message',
      };
    }

    const raw = message.trim();
    const norm = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // 0. Detección de saludos iniciales (sin mencionar personajes específicos)
    if (this._isGreeting(norm)) {
      return {
        valid: true,
        toolName: 'saludo',
        category: 'saludo',
        isGreeting: true,
        dbData: { results: [] },
      };
    }

    // Contexto del historial para preguntas de seguimiento (ej: "¿y sus tecnicas?", "¿quien ganaria?")
    let historyContext = '';
    if (Array.isArray(history) && history.length > 0) {
      historyContext = history
        .slice(-4)
        .map((h) => h.content || '')
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    }

    // Un unico Promise.all respeta el cache TTL: si los datos son frescos,
    // retorna inmediatamente sin hacer requests HTTP adicionales.
    const [pokes, jujutsus, profs] = await Promise.all([
      this.fetchLivePokemons(),
      this.fetchLiveJujutsu(),
      this.fetchLiveProfesores(),
    ]);

    // 1. ¿Hace referencia a POKÉMON?
    const pokeKeywords = [
      'pokemon', 'pokemons', 'pokedex', 'pikachu', 'charizard', 'bulbasaur', 'squirtle',
      'tipo electrico', 'tipo fuego', 'tipo agua', 'tipo planta', 'tipo veneno',
    ];
    let refersToPokemonKeyword = pokeKeywords.some((kw) => norm.includes(kw));

    let matchedPokemon = null;
    if (Array.isArray(pokes)) {
      matchedPokemon = pokes.find((p) => {
        const pNorm = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return pNorm.length >= 3 && norm.includes(pNorm);
      });
      // Seguimiento desde el historial
      if (!matchedPokemon && historyContext) {
        matchedPokemon = pokes.find((p) => {
          const pNorm = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return pNorm.length >= 3 && historyContext.includes(pNorm);
        });
        if (matchedPokemon) {
          const followUpWords = ['su', 'sus', 'el', 'ella', 'ataque', 'habilidad', 'tipo', 'hp', 'combate', 'pelea', 'evolucion', 'historia', 'mas'];
          if (followUpWords.some((w) => norm.includes(w))) {
            refersToPokemonKeyword = true;
          } else {
            matchedPokemon = null;
          }
        }
      }
    }

    if (refersToPokemonKeyword || matchedPokemon) {
      const dbData = this._filtrarPokemons(pokes, {
        nombre: matchedPokemon ? matchedPokemon.name : undefined,
        termino: raw,
        todos: norm.includes('todos') || norm.includes('cuales') || norm.includes('listar'),
      });

      if (dbData && dbData.found && dbData.results.length > 0) {
        return { valid: true, toolName: 'buscar_pokemons', dbData, category: 'pokemon', matchedEntity: matchedPokemon };
      }
      return {
        valid: false,
        reply: 'No es posible responder a tu consulta. El Pokemon consultado no se encuentra registrado en el microservicio oficial.',
        reason: 'pokemon_not_found',
      };
    }

    // 2. ¿Hace referencia a ANIME (Jujutsu Kaisen)?
    const animeKeywords = [
      'jujutsu', 'kaisen', 'hechicero', 'hechiceros', 'maldicion', 'maldiciones',
      'tecnica maldita', 'expansion de dominio', 'anime', 'gojo', 'itadori', 'sukuna',
      'megumi', 'nobara', 'nanami', 'satoru', 'yuji',
    ];
    let refersToAnimeKeyword = animeKeywords.some((kw) => norm.includes(kw));

    let matchedJujutsu = null;
    if (Array.isArray(jujutsus)) {
      matchedJujutsu = jujutsus.find((c) => {
        const cNorm = (c.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const parts = cNorm.split(' ');
        return parts.some((part) => part.length >= 3 && norm.includes(part));
      });
      // Seguimiento desde el historial
      if (!matchedJujutsu && historyContext) {
        matchedJujutsu = jujutsus.find((c) => {
          const cNorm = (c.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const parts = cNorm.split(' ');
          return parts.some((part) => part.length >= 3 && historyContext.includes(part));
        });
        if (matchedJujutsu) {
          const followUpWords = ['su', 'sus', 'el', 'ella', 'tecnica', 'grado', 'expansion', 'dominio', 'pelea', 'combate', 'ganaria', 'mas', 'historia'];
          if (followUpWords.some((w) => norm.includes(w))) {
            refersToAnimeKeyword = true;
          } else {
            matchedJujutsu = null;
          }
        }
      }
    }

    if (refersToAnimeKeyword || matchedJujutsu) {
      const dbData = this._filtrarJujutsu(jujutsus, {
        nombre: matchedJujutsu ? matchedJujutsu.name : undefined,
        termino: raw,
        todos: norm.includes('todos') || norm.includes('cuales') || norm.includes('listar'),
      });

      if (dbData && dbData.found && dbData.results.length > 0) {
        return { valid: true, toolName: 'buscar_personajes_jujutsu', dbData, category: 'jujutsu', matchedEntity: matchedJujutsu };
      }
      return {
        valid: false,
        reply: 'No es posible responder a tu consulta. El personaje de anime (Jujutsu Kaisen) consultado no se encuentra registrado en el microservicio oficial.',
        reason: 'anime_character_not_found',
      };
    }

    // 3. ¿Hace referencia a PROFESORES?
    const profKeywords = [
      'profesor', 'profesora', 'profesores', 'docente', 'docentes',
      'departamento', 'catedra', 'materia', 'facultad', 'asignatura',
    ];
    let refersToProfKeyword = profKeywords.some((kw) => norm.includes(kw));

    let matchedProf = null;
    if (Array.isArray(profs)) {
      matchedProf = profs.find((p) => {
        const pNorm = (p.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const parts = pNorm.split(' ');
        return parts.some((part) => part.length >= 3 && norm.includes(part));
      });
      // Seguimiento desde el historial
      if (!matchedProf && historyContext) {
        matchedProf = profs.find((p) => {
          const pNorm = (p.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const parts = pNorm.split(' ');
          return parts.some((part) => part.length >= 3 && historyContext.includes(part));
        });
        if (matchedProf) {
          const followUpWords = ['su', 'sus', 'el', 'ella', 'materia', 'materias', 'departamento', 'email', 'correo', 'profesion', 'mas'];
          if (followUpWords.some((w) => norm.includes(w))) {
            refersToProfKeyword = true;
          } else {
            matchedProf = null;
          }
        }
      }
    }

    if (refersToProfKeyword || matchedProf) {
      let dep = null;
      if (norm.includes('sistema') || norm.includes('sistemas')) dep = 'Sistemas';
      else if (norm.includes('matematica') || norm.includes('matematicas')) dep = 'Matematicas';
      else if (norm.includes('idioma') || norm.includes('idiomas')) dep = 'Idiomas';

      const dbData = this._filtrarProfesores(profs, {
        departamento: dep,
        nombre: matchedProf ? matchedProf.nombre : undefined,
        termino: raw,
        todos: norm.includes('todos') || norm.includes('cuales') || norm.includes('listar'),
      });

      if (dbData && dbData.found && dbData.results.length > 0) {
        return { valid: true, toolName: 'buscar_profesores', dbData, category: 'profesores', matchedEntity: matchedProf };
      }
      return {
        valid: false,
        reply: 'No es posible responder a tu consulta. El docente o profesor consultado no se encuentra registrado en el microservicio oficial.',
        reason: 'profesor_not_found',
      };
    }

    // 4. Saludo de respaldo si contiene expresiones coloquiales de bienvenida
    if (norm.includes('hola') || norm.includes('buenos dias') || norm.includes('buenas tardes') || norm.includes('saludos')) {
      return {
        valid: true,
        toolName: 'saludo',
        category: 'saludo',
        isGreeting: true,
        dbData: { results: [] },
      };
    }

    // 5. Fuera de scope
    return {
      valid: false,
      reply: 'No es posible responder a tu consulta. Solo puedo responder preguntas sobre los personajes y registros de los microservicios de Pokemon, Anime (Jujutsu Kaisen) o Profesores.',
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
      pokemonSection =
        'Base de datos de Pokemon (registros actuales del microservicio):\n' +
        this.pokemons
          .map(
            (p) =>
              `- ${p.name} (ID: ${p.id}): Tipo: ${p.type}, Habilidad: ${p.ability || 'N/A'}, HP: ${p.hp || 'N/A'}, Altura: ${p.height || 'N/A'}, Peso: ${p.weight || 'N/A'}`
          )
          .join('\n');
    }

    let jujutsuSection = 'Base de datos de Jujutsu Kaisen: No hay registros disponibles en este momento o el microservicio esta desconectado.';
    if (this.characters.length > 0) {
      jujutsuSection =
        'Base de datos de Jujutsu Kaisen (registros actuales del microservicio):\n' +
        this.characters
          .map(
            (c) =>
              `- ${c.name}: Grado: ${c.grade || 'N/A'}, Tecnica: ${c.technique || 'N/A'}, Expansion: ${c.domain_expansion || 'N/A'}, Anime: ${c.anime || 'Jujutsu Kaisen'}`
          )
          .join('\n');
    }

    let profesoresSection = 'Base de datos de Profesores: No hay registros disponibles en este momento o el microservicio esta desconectado.';
    if (this.profesores.length > 0) {
      profesoresSection =
        'Base de datos de Profesores (registros actuales del microservicio):\n' +
        this.profesores
          .map(
            (p) =>
              `- ${p.nombre}: Departamento: ${p.departamento || 'N/A'}, Profesion: ${p.profesion || 'N/A'}, Email: ${p.email || 'N/A'}, Telefono: ${p.telefono || 'N/A'}`
          )
          .join('\n');
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
1. Solo tienes permitido responder consultas cuya respuesta este explicitamente contenida en la informacion de los microservicios mostrada arriba.
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
