// Dirección del sitio de Tinkuy (la aplicación `frontend`), donde viven la portada del reto,
// el panel de demostración y los accesos de personal de salud y especialistas.
//
// La PWA se despliega en su propio origen, así que el enlace de vuelta necesita una URL
// absoluta. En producción se fija con `VITE_SITE_URL`; en desarrollo cae al puerto de
// `npm run dev` dentro de `frontend`, que es el reverso del enlace que la portada usa para
// abrir esta PWA.

const DEV_FALLBACK = 'http://localhost:5173';

export const siteUrl: string = import.meta.env.VITE_SITE_URL || DEV_FALLBACK;
