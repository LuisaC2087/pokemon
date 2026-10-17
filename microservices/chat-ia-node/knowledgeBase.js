/**
 * Base de conocimiento dinamica conectada a los 3 microservicios:
 * 1. Pokemon (PostgreSQL / pokemon-node)
 * 2. Jujutsu Kaisen (MongoDB Atlas / anime-python)
 * 3. Profesores (Supabase PostgreSQL / profesores-node)
 * 
 * NOTA: No contiene datos hardcodeados. Solo consume las APIs de los microservicios.
 */

const POKEMON_BASE_URL = process.env.POKEMON_SERVICE_URL || 'https://pokemon-node-ueas.onrender.com';
const JUJUTSU_BASE_URL = process.env.JUJUTSU_SERVICE_URL || 'https://anime-python-ueas.onrender.com';
const PROFESORES_BASE_URL = process.env.PROFESORES_SERVICE_URL || 'https://profesores-node-ueas.onrender.com';

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
      const res = await fetch(`${POKEMON_BASE_URL}/pokemons`, { signal: AbortSignal.timeout(7000) });
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
      const res = await fetch(`${JUJUTSU_BASE_URL}/characters`, { signal: AbortSignal.timeout(7000) });
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
      const res = await fetch(`${PROFESORES_BASE_URL}/profesores`, { signal: AbortSignal.timeout(7000) });
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
      const p = this.pokemons[0];
      suggestions.push(`Cuales son las caracteristicas y tipo de ${p.name}?`);
    } else {
      suggestions.push('Que informacion de Pokemon hay registrada?');
    }

    if (this.characters.length > 0) {
      const c = this.characters[0];
      suggestions.push(`Cual es la tecnica maldita de ${c.name}?`);
    } else {
      suggestions.push('Que personajes de Jujutsu Kaisen estan disponibles?');
    }

    if (this.profesores.length > 0) {
      const pr = this.profesores[0];
      suggestions.push(`A que departamento pertenece ${pr.nombre}?`);
    } else {
      suggestions.push('Cuales profesores estan registrados en el sistema?');
    }

    suggestions.push('Que entidades estan registradas en las bases de datos?');
    return suggestions;
  }

  buildSystemPrompt() {
    const hasData = this.pokemons.length > 0 || this.characters.length > 0 || this.profesores.length > 0;

    let pokemonSection = 'Base de datos de Pokemon: No hay registros cargados actualmente o el servicio esta apagado.';
    if (this.pokemons.length > 0) {
      pokemonSection = 'Base de datos de Pokemon:\n' + this.pokemons.map(p => 
        `- ${p.name} (ID: ${p.id}): Tipo: ${p.type}, Habilidad: ${p.ability || 'N/A'}, HP: ${p.hp || 'N/A'}, Altura: ${p.height || 'N/A'}, Peso: ${p.weight || 'N/A'}`
      ).join('\n');
    }

    let jujutsuSection = 'Base de datos de Jujutsu Kaisen: No hay registros cargados actualmente o el servicio esta apagado.';
    if (this.characters.length > 0) {
      jujutsuSection = 'Base de datos de Jujutsu Kaisen:\n' + this.characters.map(c => 
        `- ${c.name}: Grado: ${c.grade || 'N/A'}, Tecnica: ${c.technique || 'N/A'}, Expansion: ${c.domain_expansion || 'N/A'}`
      ).join('\n');
    }

    let profesoresSection = 'Base de datos de Profesores: No hay registros cargados actualmente o el servicio esta apagado.';
    if (this.profesores.length > 0) {
      profesoresSection = 'Base de datos de Profesores:\n' + this.profesores.map(p => 
        `- ${p.nombre}: Departamento: ${p.departamento || 'N/A'}, Profesion: ${p.profesion || 'N/A'}, Email: ${p.email || 'N/A'}, Telefono: ${p.telefono || 'N/A'}`
      ).join('\n');
    }

    return `
Eres el Asistente de Inteligencia Artificial Oficial de la aplicacion.
Tu conocimiento esta ESTRICTAMENTE LIMITADO a la informacion presente en los 3 microservicios.
NO USES NINGUN EMOJI EN TUS RESPUESTAS. ESTA ESTRICTAMENTE PROHIBIDO INCLUIR EMOJIS O EMOTICONOS.

INFORMACION REGISTRADA EN LOS MICROSERVICIOS:
${pokemonSection}

${jujutsuSection}

${profesoresSection}

REGLAS DE SEGURIDAD Y DOMINIO:
1. Solo puedes responder preguntas sobre la informacion que aparece en las listas anteriores (Pokemon, Jujutsu Kaisen y Profesores).
2. Si el usuario pregunta algo que no pertenece a estas 3 bases de datos (politica, deportes, cocina, historia general, matematicas externas, otros animes o personajes no listados):
   - NO respondas la pregunta externa.
   - Informa con claridad que unicamente puedes responder sobre la base de datos de Pokemon, Jujutsu Kaisen y Profesores registrados en los microservicios.
   - Sugiere al usuario preguntas validas que si puede realizarte.
3. Si la base de datos de un tema en particular esta vacia porque el microservicio no esta disponible:
   - Informa al usuario que el microservicio de ese tema no se encuentra disponible actualmente.
4. Responde de forma sobria, clara, en espanol, sin ningun emoji.
`.trim();
  }

  isRelevantQuery(query) {
    const q = query.toLowerCase();

    // Saludos y preguntas de ayuda
    const greetings = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'que puedes hacer', 'ayuda', 'quien eres', 'menu', 'que sabes'];
    if (greetings.some(g => q.includes(g))) return true;

    // Palabras clave
    const pokemonKeywords = ['pokemon', 'pokémon', 'tipo', 'habilidad', 'hp', 'fuego', 'agua', 'electrico', 'planta', ...this.pokemons.map(p => p.name.toLowerCase())];
    const jjkKeywords = ['jujutsu', 'kaisen', 'hechicero', 'tecnica', 'maldita', 'dominio', 'expansion', 'grado', ...this.characters.map(c => c.name.toLowerCase())];
    const profKeywords = ['profesor', 'profesores', 'docente', 'docentes', 'departamento', 'sistemas', 'email', 'correo', 'telefono', ...this.profesores.map(p => p.nombre.toLowerCase())];

    const allKeywords = [...pokemonKeywords, ...jjkKeywords, ...profKeywords];
    return allKeywords.some(keyword => q.includes(keyword));
  }

  // Generador de respuesta con control de errores si no hay microservicio o si no hay API Key de Gemini
  generateFallbackResponse(query) {
    const q = query.toLowerCase().trim();

    // Saludos
    if (['hola', 'buenas', 'buenos dias', 'buenas tardes', 'que tal', 'hey'].some(s => q.startsWith(s) || q === s)) {
      return {
        reply: "Hola. Soy el asistente de IA de la aplicacion. Puedo responder tus consultas sobre la informacion registrada en los microservicios de Pokemon, Jujutsu Kaisen y Profesores. En que te puedo ayudar?",
        suggestions: this.getSuggestedQuestions().slice(0, 3),
        outOfScope: false
      };
    }

    // Comprobar consultas sobre Pokemon
    const KNOWN_POKE = ['pokemon', 'pokémon', 'pikachu', 'charizard', 'blastoise', 'bulbasaur', 'squirtle', 'charmander', 'gengar', 'snorlax', 'mewtwo', 'eevee'];
    const isPokeQuery = KNOWN_POKE.some(k => q.includes(k)) || this.pokemons.some(p => q.includes(p.name.toLowerCase()));
    if (isPokeQuery) {
      if (this.pokemons.length === 0) {
        return {
          reply: `El microservicio de Pokemon no se encuentra disponible actualmente (${this.serviceErrors.pokemon || 'servicio no conectado o base de datos vacia'}). No es posible consultar la informacion en este momento.`,
          suggestions: this.getSuggestedQuestions().slice(0, 2),
          outOfScope: false
        };
      }

      const matchedPokemon = this.pokemons.find(p => q.includes(p.name.toLowerCase()));
      if (matchedPokemon) {
        return {
          reply: `Informacion de ${matchedPokemon.name} (ID: ${matchedPokemon.id}):\n\n` +
                 `- Tipo: ${matchedPokemon.type}\n` +
                 `- Habilidad: ${matchedPokemon.ability || 'N/A'}\n` +
                 `- Puntos de salud (HP): ${matchedPokemon.hp || 'N/A'}\n` +
                 `- Altura: ${matchedPokemon.height || 'N/A'}\n` +
                 `- Peso: ${matchedPokemon.weight || 'N/A'}`,
          suggestions: this.getSuggestedQuestions().slice(0, 3),
          outOfScope: false
        };
      }

      const names = this.pokemons.map(p => `- ${p.name} (Tipo: ${p.type})`).join('\n');
      return {
        reply: `Pokemon registrados en el microservicio:\n\n${names}\n\nPuedes consultar los detalles de cualquiera de ellos.`,
        suggestions: this.getSuggestedQuestions().slice(0, 3),
        outOfScope: false
      };
    }

    // Comprobar consultas sobre Jujutsu Kaisen
    const KNOWN_JJK = ['jujutsu', 'kaisen', 'hechicero', 'maldita', 'dominio', 'expansion', 'gojo', 'sukuna', 'itadori', 'fushiguro', 'kugisaki', 'nanami', 'geto'];
    const isJjkQuery = KNOWN_JJK.some(k => q.includes(k)) || this.characters.some(c => q.includes(c.name.toLowerCase()));
    if (isJjkQuery) {
      if (this.characters.length === 0) {
        return {
          reply: `El microservicio de Jujutsu Kaisen no se encuentra disponible actualmente (${this.serviceErrors.jujutsu || 'servicio no conectado o base de datos vacia'}). No es posible consultar la informacion en este momento.`,
          suggestions: this.getSuggestedQuestions().slice(0, 2),
          outOfScope: false
        };
      }

      const matchedJujutsu = this.characters.find(c => q.includes(c.name.toLowerCase()));
      if (matchedJujutsu) {
        return {
          reply: `Informacion de ${matchedJujutsu.name}:\n\n` +
                 `- Grado: ${matchedJujutsu.grade}\n` +
                 `- Tecnica maldita: ${matchedJujutsu.technique}\n` +
                 `- Expansion de dominio: ${matchedJujutsu.domain_expansion}\n` +
                 `- Anime: ${matchedJujutsu.anime}`,
          suggestions: this.getSuggestedQuestions().slice(0, 3),
          outOfScope: false
        };
      }

      const names = this.characters.map(c => `- ${c.name} (${c.grade})`).join('\n');
      return {
        reply: `Personajes de Jujutsu Kaisen registrados en el microservicio:\n\n${names}\n\nPuedes consultar los detalles de cualquiera de ellos.`,
        suggestions: this.getSuggestedQuestions().slice(0, 3),
        outOfScope: false
      };
    }

    // Comprobar consultas sobre Profesores
    const isProfQuery = q.includes('profesor') || q.includes('profesores') || q.includes('docente') || q.includes('docentes') || q.includes('departamento') || this.profesores.some(p => q.includes(p.nombre.toLowerCase()));
    if (isProfQuery) {
      if (this.profesores.length === 0) {
        return {
          reply: `El microservicio de Profesores no se encuentra disponible actualmente (${this.serviceErrors.profesores || 'sin conexion con la base de datos'}). No es posible consultar la informacion en este momento.`,
          suggestions: this.getSuggestedQuestions().slice(0, 2),
          outOfScope: false
        };
      }

      const matchedProf = this.profesores.find(p => q.includes(p.nombre.toLowerCase()));
      if (matchedProf) {
        return {
          reply: `Informacion del docente ${matchedProf.nombre}:\n\n` +
                 `- Departamento: ${matchedProf.departamento || 'No especificado'}\n` +
                 `- Profesion / Cargo: ${matchedProf.profesion || 'No especificado'}\n` +
                 `- Email: ${matchedProf.email || 'No registrado'}\n` +
                 `- Telefono: ${matchedProf.telefono || 'No registrado'}`,
          suggestions: this.getSuggestedQuestions().slice(0, 3),
          outOfScope: false
        };
      }

      const names = this.profesores.map(p => `- ${p.nombre} (${p.departamento})`).join('\n');
      return {
        reply: `Profesores registrados en el microservicio:\n\n${names}\n\nPuedes consultar los detalles de cualquiera de ellos.`,
        suggestions: this.getSuggestedQuestions().slice(0, 3),
        outOfScope: false
      };
    }

    // Consulta fuera de alcance
    return {
      reply: "No puedo responder a esa pregunta. Mi conocimiento esta estrictamente limitado a la informacion de las bases de datos de los microservicios de Pokemon, Jujutsu Kaisen y Profesores. Puedes realizar consultas sobre cualquiera de estas tres categorias.",
      suggestions: this.getSuggestedQuestions().slice(0, 3),
      outOfScope: true
    };
  }
}

module.exports = new KnowledgeBase();
