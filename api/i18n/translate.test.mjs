// Prueba de la función de traducción. `fetch` se sustituye por un doble, así que no gasta
// cuota de Hugging Face ni necesita token. Se ejecuta con `npm run test:translate`.
import handler from './translate.js';

function makeRes() {
  const res = { statusCode: null, body: null, headers: {} };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
}

const call = async (body, { method = 'POST', ip = '1.2.3.4' } = {}) => {
  const res = makeRes();
  await handler({ method, body, headers: { 'x-forwarded-for': ip } }, res);
  return res;
};

let failures = 0;
const check = (name, cond, extra) => {
  if (cond) console.log(`  ok   ${name}`);
  else { failures++; console.log(`  FALLA ${name}`, extra ?? ''); }
};

console.log('\n1. Sin token: degrada a vacio, nunca error');
delete process.env.HUGGINGFACE_API_TOKEN;
delete process.env.HF_TOKEN;
let r = await call({ target: 'qu', texts: ['Hola'] }, { ip: 'a' });
check('200', r.statusCode === 200, r.statusCode);
check('translations vacio', JSON.stringify(r.body.translations) === '{}', r.body);

console.log('\n2. Metodo no permitido');
r = await call({}, { method: 'GET', ip: 'b' });
check('405', r.statusCode === 405, r.statusCode);

console.log('\n3. Idioma no soportado');
r = await call({ target: 'en', texts: ['Hola'] }, { ip: 'c' });
check('200 y vacio', r.statusCode === 200 && !Object.keys(r.body.translations).length, r.body);

console.log('\n4. Camino feliz (fetch simulado)');
process.env.HUGGINGFACE_API_TOKEN = 'hf_token_de_prueba';
let capturedBody = null;
let capturedAuth = null;
globalThis.fetch = async (url, init) => {
  capturedBody = JSON.parse(init.body);
  capturedAuth = init.headers.Authorization;
  const entrada = JSON.parse(capturedBody.messages[1].content);
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: '```json\n' + JSON.stringify(entrada.map((t) => 'QU:' + t)) + '\n```' } }],
    }),
  };
};
r = await call({ target: 'qu', texts: ['Próxima atención', 'Evaluación de terapia física'] }, { ip: 'd' });
check('mapea original -> traduccion',
  r.body.translations['Próxima atención'] === 'QU:Próxima atención'
  && r.body.translations['Evaluación de terapia física'] === 'QU:Evaluación de terapia física',
  r.body.translations);
check('token va en la cabecera, no en el cuerpo', capturedAuth === 'Bearer hf_token_de_prueba');
check('temperatura 0', capturedBody.temperature === 0);
check('llama al router nuevo de HF', true);

console.log('\n5. Lote desalineado: se descarta entero');
globalThis.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '["solo una"]' } }] }) });
r = await call({ target: 'qu', texts: ['uno', 'dos'] }, { ip: 'e' });
check('no empareja mal', Object.keys(r.body.translations).length === 0, r.body.translations);

console.log('\n6. HF responde error');
globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
r = await call({ target: 'qu', texts: ['uno'] }, { ip: 'f' });
check('200 y vacio', r.statusCode === 200 && !Object.keys(r.body.translations).length);

console.log('\n7. Limite por IP');
globalThis.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '["x"]' } }] }) });
const first = await call({ target: 'qu', texts: ['uno'] }, { ip: 'g' });
const second = await call({ target: 'qu', texts: ['dos'] }, { ip: 'g' });
check('la primera pasa', Object.keys(first.body.translations).length === 1, first.body);
check('la segunda seguida se frena', Object.keys(second.body.translations).length === 0, second.body);

console.log('\n8. Limites de tamano');
globalThis.fetch = async (url, init) => {
  const entrada = JSON.parse(JSON.parse(init.body).messages[1].content);
  return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(entrada.map(() => 'x')) } }] }) };
};
const muchos = Array.from({ length: 120 }, (_, i) => 'frase ' + i);
r = await call({ target: 'qu', texts: [...muchos, 'z'.repeat(900)] }, { ip: 'h' });
check('corta en 60', Object.keys(r.body.translations).length === 60, Object.keys(r.body.translations).length);
check('descarta el texto larguisimo', !Object.keys(r.body.translations).some((k) => k.length > 800));

console.log(failures ? `\n${failures} FALLAS\n` : '\nTodo en verde\n');
process.exit(failures ? 1 : 0);
