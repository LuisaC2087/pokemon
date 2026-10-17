const knowledgeBase = require('./knowledgeBase');

async function runTests() {
  console.log('--- TEST 1: Verificar que NO hay datos hardcodeados ---');
  console.log(`Pokemons iniciales: ${knowledgeBase.pokemons.length}`);
  console.log(`Jujutsu iniciales: ${knowledgeBase.characters.length}`);
  console.log(`Profesores iniciales: ${knowledgeBase.profesores.length}`);
  if (knowledgeBase.pokemons.length === 0 && knowledgeBase.characters.length === 0 && knowledgeBase.profesores.length === 0) {
    console.log('[OK] Test 1 PASO: No existen datos hardcodeados');
  } else {
    console.error('[FAIL] Test 1 FALLO: Aun hay datos en memoria');
  }

  console.log('\n--- TEST 2: Verificar construccion de System Prompt estricto ---');
  const prompt = knowledgeBase.buildSystemPrompt();
  console.log('Longitud prompt:', prompt.length);
  if (prompt.includes('EXCLUSIVAMENTE') && prompt.includes('NO USES NINGUN EMOJI')) {
    console.log('[OK] Test 2 PASO: Prompt de seguridad y restriccion de dominio configurado');
  } else {
    console.error('[FAIL] Test 2 FALLO');
  }

  console.log('\n--- TEST 3: Preguntas sugeridas dinamicas ---');
  const suggestions = knowledgeBase.getSuggestedQuestions();
  console.log('Sugerencias:', suggestions);
  if (suggestions.length >= 2) {
    console.log('[OK] Test 3 PASO: Sugerencias dinamicas generadas');
  } else {
    console.error('[FAIL] Test 3 FALLO');
  }

  console.log('\n--- PRUEBAS COMPLETADAS ---');
}

runTests();
