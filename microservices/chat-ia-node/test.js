const knowledgeBase = require('./knowledgeBase');

async function runTests() {
  console.log('--- TEST 1: Verificar que NO hay datos hardcodeados al inicio ---');
  console.log(`Pokemons iniciales: ${knowledgeBase.pokemons.length}`);
  console.log(`Jujutsu iniciales: ${knowledgeBase.characters.length}`);
  console.log(`Profesores iniciales: ${knowledgeBase.profesores.length}`);
  if (knowledgeBase.pokemons.length === 0 && knowledgeBase.characters.length === 0 && knowledgeBase.profesores.length === 0) {
    console.log('[OK] Test 1 PASO: No existen datos hardcodeados');
  } else {
    console.error('[FAIL] Test 1 FALLO: Aun hay datos en memoria');
  }

  console.log('\n--- TEST 2: Manejo de errores cuando microservicio no esta disponible ---');
  const resEmptyPoke = knowledgeBase.generateFallbackResponse('Cuentame de Pikachu');
  console.log('Respuesta ante servicio no disponible:', resEmptyPoke.reply);
  if (resEmptyPoke.reply.includes('no se encuentra disponible')) {
    console.log('[OK] Test 2 PASO: Manejo de error cuando no hay conexion');
  } else {
    console.error('[FAIL] Test 2 FALLO');
  }

  console.log('\n--- TEST 3: Consulta fuera de dominio ---');
  const resOutOfDomain = knowledgeBase.generateFallbackResponse('Cual es la receta de pasta');
  console.log('outOfScope:', resOutOfDomain.outOfScope);
  console.log('Respuesta:', resOutOfDomain.reply);
  if (resOutOfDomain.outOfScope && resOutOfDomain.suggestions.length >= 2) {
    console.log('[OK] Test 3 PASO: Consulta fuera de dominio bloqueada con sugerencias');
  } else {
    console.error('[FAIL] Test 3 FALLO');
  }

  console.log('\n--- TEST 4: Comprobar que NO contiene ningun emoji ---');
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/u;
  const hasEmoji = emojiRegex.test(resEmptyPoke.reply) || emojiRegex.test(resOutOfDomain.reply);
  if (!hasEmoji) {
    console.log('[OK] Test 4 PASO: Cero emojis detectados');
  } else {
    console.error('[FAIL] Test 4 FALLO: Se encontraron emojis');
  }

  console.log('\n--- PRUEBAS COMPLETADAS ---');
}

runTests();
