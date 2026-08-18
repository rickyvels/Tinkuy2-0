#!/usr/bin/env node
// Compila las tres SPA en un único directorio estático: la portada en la raíz, la PWA familiar
// en /familia/ y la plataforma profesional en /pro/.
//
// La portada es la puerta de entrada: su botón «Abrir Aplicación» lleva a la PWA familiar y el
// de «Personal Médico» a la plataforma. Al compartir origen, esos enlaces son rutas relativas y
// no hay ninguna URL que mantener sincronizada entre despliegues.
//
// Un solo origen es además lo que permite que todas llamen a `/api/v1` sin conocer la URL del
// backend. Eso elimina el CORS y, sobre todo, el error de que la URL de la API se congela en el
// bundle durante el build: una URL relativa no puede quedar apuntando al sitio equivocado.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// El orden importa: la portada escribe en la raíz de `dist`, así que va primero y las otras
// dos caen después en sus subcarpetas.
const apps = [
  // `frontend` lee la API con VITE_API_BASE_URL, que vacía significa «mismo origen».
  { prefix: 'frontend', target: dist, base: '/', env: {} },
  { prefix: 'apps/family-pwa', target: join(dist, 'familia'), base: '/familia/', env: { VITE_API_URL: '/api/v1' } },
  { prefix: 'apps/platform', target: join(dist, 'pro'), base: '/pro/', env: { VITE_API_URL: '/api/v1' } },
];

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
  // Cada aplicación tiene su propio node_modules y sus binarios (tsc, vite) viven ahí. Sin este
  // paso el build falla con "tsc: command not found", porque instalar la raíz no instala nada:
  // el package.json de la raíz solo orquesta y no declara dependencias.
  try {
    run(['--prefix', prefix, 'ci']);
  } catch {
    // `npm ci` aborta si el lockfile y el package.json se desincronizan. Preferimos un
    // despliegue que compile a uno que se caiga por una discrepancia de versiones.
    console.warn(`[build-web] "npm ci" falló en ${prefix}; se reintenta con "npm install".`);
    run(['--prefix', prefix, 'install']);
  }
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

for (const app of apps) {
  console.log(`[build-web] Compilando ${app.prefix} con base ${app.base}`);
  install(app.prefix);
  // Lo que va tras `--` se añade al final del script, es decir a `vite build`. Pasar el prefijo
  // por la bandera nativa evita leer `process.env` dentro de vite.config.ts, que obligaría a
  // instalar @types/node solo para type-chequear ese archivo.
  run(['--prefix', app.prefix, 'run', 'build', '--', `--base=${app.base}`], app.env);
  cpSync(join(root, app.prefix, 'dist'), app.target, { recursive: true });
}

console.log(`[build-web] Listo. Portada en /, PWA familiar en /familia/, plataforma en /pro/.`);
