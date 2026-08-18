// v6: la PWA deja de asumir que vive en la raíz de su origen. Subir la versión descarta la
// caché anterior en el `activate`, que si no seguiría sirviendo rutas del despliegue viejo.
const CACHE = 'sensoria-family-v6';
const STATIC_PATH = /\.(?:css|js|png|svg|webp|ico|woff2?)$/i;

// Prefijo bajo el que está montada la PWA: `/` cuando ocupa su propio origen y `/familia/` en
// el despliegue de un solo dominio. `registration.scope` es la única forma de saberlo desde
// aquí: este archivo se copia tal cual desde `public/` y Vite no reescribe su contenido.
const ROOT = new URL(self.registration.scope).pathname;

// Este service worker pertenece a la PWA familiar y su alcance no debe invadir lo que comparte
// origen con ella: sin estas exclusiones, una navegación a /pro/ o a la portada sin conexión
// respondería con la aplicación equivocada.
function isOwnedByFamilyApp(url) {
  return url.origin === self.location.origin
    && url.pathname.startsWith(ROOT)
    // Cuando ROOT es `/` el prefijo no distingue nada, así que la API y la plataforma
    // profesional siguen necesitando una exclusión explícita.
    && !url.pathname.startsWith('/api/')
    && !url.pathname.startsWith('/pro/');
}

function isStaticAsset(url) {
  return isOwnedByFamilyApp(url)
    && (STATIC_PATH.test(url.pathname) || url.pathname === `${ROOT}manifest.webmanifest`);
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(ROOT)));
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
        .catch(() => caches.match(ROOT)),
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
