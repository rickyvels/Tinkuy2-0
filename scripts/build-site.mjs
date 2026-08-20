#!/usr/bin/env node
// Compila el sitio publicado: la aplicación de `frontend/` en la raíz y la PWA familiar
// (`apps/family-pwa`) en `/pwa/`, dentro del mismo directorio de salida.
//
// Comparten dominio a propósito. Es lo que permite que el botón «Abrir Aplicación» de la
// portada sea un enlace relativo —`/pwa/`, sin conocer la URL del despliegue— y lo que
// dejaría a las dos llamar a `/api/v1` sin CORS si la API se montara en este mismo origen.
//
// La PWA se compila con `--base=/pwa/` porque su bundle referencia sus recursos por ruta
// absoluta: sin la bandera pediría `/assets/…`, que en la raíz ya ocupa el sitio.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'frontend', 'dist');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(args, env) {
  execFileSync(npm, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    // Node se niega a ejecutar un .cmd sin shell desde las versiones que corrigieron CVE-2024-27980.
    shell: process.platform === 'win32',
  });
}

function install(prefix) {
  // Cada aplicación tiene su propio node_modules, y sus binarios (tsc, vite) viven ahí. El
  // package.json de la raíz solo orquesta y no declara dependencias, así que instalarlo no
  // instala nada: sin este paso el build se cae con "tsc: command not found".
  try {
    run(['--prefix', prefix, 'ci']);
  } catch {
    // `npm ci` aborta si el lockfile y el package.json se desincronizan. Preferimos un
    // despliegue que compile a uno que se caiga por una discrepancia de versiones.
    console.warn(`[build-site] "npm ci" falló en ${prefix}; se reintenta con "npm install".`);
    run(['--prefix', prefix, 'install']);
  }
}

console.log('[build-site] Compilando frontend/ en la raíz');
install('frontend');
run(['--prefix', 'frontend', 'run', 'build']);

console.log('[build-site] Compilando apps/family-pwa en /pwa/');
install('apps/family-pwa');
// Lo que va tras `--` se añade al final del script, es decir a `vite build`. Pasar el prefijo
// por la bandera nativa evita leer `process.env` dentro de vite.config.ts, que obligaría a
// instalar @types/node solo para type-chequear ese archivo.
//
// `VITE_API_URL` se deja sin definir a propósito: la API vive en otro despliegue (ver
// `render.yaml`) y la PWA ya trae un modo de demostración que entra solo cuando la red falla.
// Apuntarla a `/api/v1` sería peor que no apuntarla: la reescritura del alojamiento
// respondería el index.html con un 200 y el fallback nunca se activaría.
run(['--prefix', 'apps/family-pwa', 'run', 'build', '--', '--base=/pwa/'], {
  VITE_SITE_URL: '/',
  // La traducción sí vive en este despliegue: `api/i18n/translate.js` es una función
  // serverless de Vercel. Es la única parte de la API que comparte origen con el sitio.
  VITE_TRANSLATE_URL: '/api/i18n/translate',
});

mkdirSync(outDir, { recursive: true });
cpSync(join(root, 'apps/family-pwa/dist'), join(outDir, 'pwa'), { recursive: true });

console.log('[build-site] Listo. Sitio en /, PWA familiar en /pwa/.');
