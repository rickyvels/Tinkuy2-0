// Dirección del sitio de Tinkuy (la aplicación `frontend`), donde viven la portada del reto,
// el panel de demostración y los accesos de personal de salud y especialistas.
//
// En el despliegue de un solo dominio la portada es la raíz del mismo origen, así que una
// ruta relativa basta y no hay ninguna URL que mantener sincronizada. `VITE_SITE_URL` sigue
// disponible para el caso en que la PWA se despliegue en un origen aparte, y en desarrollo
// se cae al puerto de `npm run dev` dentro de `frontend`.

const DEV_FALLBACK = 'http://localhost:5173';

export const siteUrl: string =
  import.meta.env.VITE_SITE_URL || (import.meta.env.DEV ? DEV_FALLBACK : '/');
