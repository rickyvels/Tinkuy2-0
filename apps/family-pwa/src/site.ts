// Dirección del sitio de Tinkuy (la aplicación `frontend`), donde viven la portada del reto,
// el panel de demostración y los accesos de personal de salud y especialistas.
//
// El despliegue publica el sitio en la raíz y esta PWA en `/pwa/`, así que en producción
// `VITE_SITE_URL` vale «/». En desarrollo cae al puerto de `npm run dev` dentro de
// `frontend`, que es el reverso del enlace que la portada usa para abrir esta PWA.

const DEV_FALLBACK = 'http://localhost:5173';

export const siteUrl: string = import.meta.env.VITE_SITE_URL || DEV_FALLBACK;

/**
 * Ruta de un archivo de `public/`.
 *
 * `BASE_URL` es la raíz pública del bundle y siempre acaba en «/»: «/» cuando la PWA se sirve
 * sola y «/pwa/» cuando comparte dominio con el sitio. Escribir «/tinku.png» a mano funciona
 * solo en el primer caso —en el segundo la ruta no existe y la imagen sale rota—, así que
 * todo lo que cuelgue de `public/` tiene que pasar por aquí.
 */
export const asset = (name: string): string => `${import.meta.env.BASE_URL}${name}`;
