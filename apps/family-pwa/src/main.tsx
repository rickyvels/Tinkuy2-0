import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './registration.css';
import './recovery.css';
import './touch.css';
import './family-workspace.css';
import './semantic-theme.css';
import './semantic-accessibility.css';
import './healthcare-ui.css';
// Última: reasigna los tokens de las hojas anteriores en lugar de duplicar sus reglas.
import './tinkuy.css';

// Raíz pública del bundle; Vite la garantiza terminada en «/». Es «/» cuando la PWA se sirve
// sola y «/pwa/» cuando comparte dominio con el sitio de Tinkuy. Todo lo del service worker
// —su URL, su alcance y lo que precarga— cuelga de ella para no reclamar rutas ajenas.
const BASE = import.meta.env.BASE_URL;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${BASE}service-worker.js`, { scope: BASE }).then((registration) => {
      const assets = performance.getEntriesByType('resource').map((entry) => entry.name).filter((value) => {
        try {
          const url = new URL(value);
          return url.origin === window.location.origin
            && url.pathname.startsWith(BASE)
            && (/\.(?:css|js|png|svg|webp|ico|woff2?)$/i.test(url.pathname) || url.pathname === `${BASE}manifest.webmanifest`);
        } catch { return false; }
      });
      registration.active?.postMessage({ type: 'PRECACHE_CURRENT_BUILD', assets });
      navigator.serviceWorker.ready.then((ready) => ready.active?.postMessage({ type: 'PRECACHE_CURRENT_BUILD', assets }));
    });
  });
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
