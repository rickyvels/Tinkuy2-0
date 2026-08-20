// v6: el archivo deja de dar por hecho que la PWA vive en la raíz del dominio. Subir la
// versión descarta la caché anterior en el `activate`, que si no seguiría sirviendo rutas
// absolutas que ya no existen.
const CACHE = 'sensoria-family-v6';
const STATIC_PATH = /\.(?:css|js|png|svg|webp|ico|woff2?)$/i;

// Raíz pública de la PWA, deducida de dónde está este mismo archivo: «/» cuando se sirve
// sola y «/pwa/» cuando comparte dominio con el sitio de Tinkuy. Siempre acaba en «/».
const BASE = new URL('./', self.location).pathname;

// El alcance no debe invadir lo que hay fuera de la PWA: la API, el sitio en la raíz, o la
// plataforma profesional bajo /pro/ en el despliegue de un solo dominio. Sin esta exclusión,
// una navegación ahí sin conexión respondería con la aplicación equivocada.
function isOwnedByFamilyApp(url) {
  return url.origin === self.location.origin
    && url.pathname.startsWith(BASE)
    && !url.pathname.startsWith(`${BASE}api/`)
    && !url.pathname.startsWith(`${BASE}pro/`);
}

function isStaticAsset(url) {
  return isOwnedByFamilyApp(url)
    && (STATIC_PATH.test(url.pathname) || url.pathname === `${BASE}manifest.webmanifest`);
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(BASE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('sensoria-family-') && key !== CACHE).map((key) => caches.delete(key)),
  )));
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'PRECACHE_CURRENT_BUILD' || !Array.isArray(event.data.assets)) return;
  const staticAssets = event.data.assets.filter((value) => {
    try { return isStaticAsset(new URL(value)); } catch { return false; }
  });
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(staticAssets)));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.headers.has('Authorization')) return;
  const url = new URL(event.request.url);
  if (!isOwnedByFamilyApp(url)) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match(BASE)),
    );
    return;
  }

  if (!isStaticAsset(url)) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    // Un recurso que todavía no existe no da 404: el alojamiento reescribe cualquier ruta
    // desconocida al index.html, y devuelve 200 con HTML. Guardarlo envenenaba la entrada —la
    // caché es «primero caché», así que esa página se servía como si fuera la imagen para
    // siempre—. Solo se almacena si el tipo de contenido corresponde a un recurso estático.
    const contentType = response.headers.get('content-type') || '';
    const isHtml = contentType.includes('text/html');
    if (response.ok && response.type === 'basic' && !isHtml) {
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    }
    return response;
  })));
});
