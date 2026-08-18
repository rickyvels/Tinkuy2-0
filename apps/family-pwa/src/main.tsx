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

// Prefijo del despliegue: `/` cuando la PWA ocupa su propio origen y `/familia/` cuando
// comparte dominio con la portada. Vite lo fija en tiempo de compilación con `--base`.
const base = import.meta.env.BASE_URL;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // El alcance no puede exceder la carpeta desde la que se sirve el worker, así que se
    // registra dentro de la base en lugar de en la raíz del origen.
    void navigator.serviceWorker.register(`${base}service-worker.js`, { scope: base }).then((registration) => {
      const assets = performance.getEntriesByType('resource').map((entry) => entry.name).filter((value) => {
        try {
          const url = new URL(value);
          return url.origin === window.location.origin
            && url.pathname.startsWith(base)
            && !url.pathname.startsWith('/api/')
            && (/\.(?:css|js|png|svg|webp|ico|woff2?)$/i.test(url.pathname) || url.pathname === `${base}manifest.webmanifest`);
        } catch { return false; }
      });
      registration.active?.postMessage({ type: 'PRECACHE_CURRENT_BUILD', assets });
      navigator.serviceWorker.ready.then((ready) => ready.active?.postMessage({ type: 'PRECACHE_CURRENT_BUILD', assets }));
    });
  });
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
