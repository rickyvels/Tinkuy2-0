// Traducción al quechua para la PWA familiar. Función serverless de Vercel: vive en el mismo
// despliegue que el sitio, así que el navegador la llama en `/api/i18n/translate` sin CORS.
//
// Por qué existe, si `api/app/translation.py` ya hacía esto: aquel código llama a NLLB-200 por
// `api-inference.huggingface.co`, y hoy ningún proveedor de inferencia de Hugging Face sirve
// ese modelo —su `inferenceProviderMapping` está vacío—. De hecho ninguno de los modelos con
// tarea `translation` que HF sirve cubre el quechua. La única vía que queda en HF es pedírselo
// a un modelo de chat grande, que es lo que hace este archivo.
//
// EL TOKEN NUNCA VIAJA AL NAVEGADOR. Vive como variable de entorno del proyecto de Vercel y
// solo se lee aquí, en el servidor. Por eso la PWA no llama a Hugging Face directamente.
//
// Alcance: esto traduce el texto que redacta el backend (mensajes de ruta, títulos de tarea).
// Los rótulos de la interfaz NO pasan por aquí: viven en el diccionario escrito a mano de
// `apps/family-pwa/src/i18n.ts`, que es instantáneo, funciona sin conexión y se puede revisar.
// Una app de salud no debería mostrar texto traducido por máquina sin que nadie lo haya leído.

const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';

// Modelo por defecto: se eligió por disponibilidad —es de los que más proveedores sirven, así
// que es el que menos probablemente devuelva un 404 en mitad de una demostración—. Se cambia
// sin tocar código con la variable de entorno.
const DEFAULT_MODEL = 'zai-org/GLM-5.2';

const SUPPORTED_TARGETS = new Set(['qu']);
const MAX_TEXTS = 60;
const MAX_TEXT_LENGTH = 800;
const TIMEOUT_MS = 25000;

// Límite por IP. Es «lo mejor que se puede hacer aquí»: cada instancia de la función tiene su
// propio mapa y las instancias van y vienen, así que no es una barrera dura. Sirve para que un
// bucle accidental en el cliente no dispare la factura, no como control de abuso.
const MIN_MS_BETWEEN_CALLS = 1000;
const lastCallByClient = new Map();

const SYSTEM_PROMPT = [
  'Eres un traductor del castellano al quechua sureño (variante chanka/ayacuchano, código quy).',
  'El texto pertenece a una aplicación de salud infantil que usan familias peruanas.',
  'Reglas:',
  '- Traduce con lenguaje llano, como hablaría un profesional de salud con una madre o un padre.',
  '- Conserva tal cual los números, las fechas, las horas y los nombres propios.',
  '- No expliques, no comentes y no añadas nada que no esté en el original.',
  '- Responde ÚNICAMENTE con un array JSON de cadenas, del mismo tamaño y en el mismo orden',
  '  que el array que recibes. Sin markdown, sin texto alrededor.',
].join('\n');

/** Deja solo textos válidos, únicos y dentro de los límites. Conserva el orden de llegada. */
function normalizeTexts(texts) {
  if (!Array.isArray(texts)) return [];
  const seen = new Set();
  const unique = [];
  for (const value of texts) {
    if (typeof value !== 'string') continue;
    const normalized = value.trim();
    if (!normalized || normalized.length > MAX_TEXT_LENGTH || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
    if (unique.length === MAX_TEXTS) break;
  }
  return unique;
}

/** El modelo a veces envuelve el JSON en un bloque de código pese a que se le pidió que no. */
function parseJsonArray(content) {
  if (typeof content !== 'string') return null;
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function askModel(texts) {
  const token = process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN;
  if (!token) return {};

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(HF_ROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.HF_TRANSLATION_MODEL || DEFAULT_MODEL,
        // Una traducción no debe variar entre llamadas: la misma frase tiene que verse igual
        // en dos pantallas distintas, y la caché del cliente guarda la primera que llegue.
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(texts) },
        ],
      }),
    });
    if (!response.ok) return {};
    const body = await response.json();
    const translated = parseJsonArray(body?.choices?.[0]?.message?.content);
    // Si el modelo devolvió otra cantidad de frases se descarta el lote entero: emparejar por
    // posición un array desalineado pondría la traducción de una frase debajo de otra, que es
    // peor que dejarlo todo en castellano.
    if (!translated || translated.length !== texts.length) return {};

    const result = {};
    texts.forEach((original, index) => {
      const candidate = translated[index];
      if (typeof candidate === 'string' && candidate.trim()) result[original] = candidate.trim();
    });
    return result;
  } catch {
    // Sin red, tiempo agotado o respuesta ilegible: se devuelve vacío y el cliente se queda con
    // el castellano. Un fallo de traducción nunca debe dejar la pantalla en blanco.
    return {};
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Las traducciones ya se guardan en el `localStorage` del cliente; una copia intermedia solo
  // serviría para servir una versión vieja tras cambiar de modelo.
  response.setHeader('Cache-Control', 'no-store');

  const payload = typeof request.body === 'string' ? safeParse(request.body) : request.body;
  const target = payload?.target;
  if (!SUPPORTED_TARGETS.has(target)) {
    return response.status(200).json({ target: target ?? null, translations: {} });
  }

  const client = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  if (now - (lastCallByClient.get(client) ?? 0) < MIN_MS_BETWEEN_CALLS) {
    // Sin traducción, no un error: el cliente ya tiene el castellano en pantalla.
    return response.status(200).json({ target, translations: {} });
  }
  lastCallByClient.set(client, now);

  const texts = normalizeTexts(payload?.texts);
  if (!texts.length) return response.status(200).json({ target, translations: {} });

  return response.status(200).json({ target, translations: await askModel(texts) });
}

function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}
