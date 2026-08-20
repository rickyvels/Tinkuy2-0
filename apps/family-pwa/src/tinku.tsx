// Tinku, la mascota, y el emblema de la marca.
//
// La mascota es el PNG del proyecto de diseño (`assets/tinku.png`), no un dibujo vectorial:
// es un render con transparencia y el vector no lo reproduce. Vive en `public/`, así que el
// service worker lo precachea y sigue apareciendo sin conexión.

import { asset } from './site';

type MarkProps = { className?: string };

/** Proporción del render original (337 × 589). `size` fija el alto y el ancho lo sigue. */
const TINKU_RATIO = 337 / 589;

export type TinkuAnimation = 'idle' | 'none';

/**
 * Tinku.
 *
 * `message` monta el globo de diálogo con sus dos chispas; sin él solo se dibuja el
 * personaje, que es como se usa en la tarjeta del inicio y en las pistas del juego.
 */
export function Tinku({ size = 320, message, animation = 'idle', shadow = true, className }: MarkProps & {
  size?: number;
  message?: string;
  animation?: TinkuAnimation;
  shadow?: boolean;
}) {
  const width = Math.round(size * TINKU_RATIO);
  return (
    <div className={`tinku${className ? ` ${className}` : ''}`} data-anim={animation}>
      {message && (
        <div className="tinku-bubble">
          <Sparkle className="tinku-spark tinku-spark-a" size={24} />
          <span>{message}</span>
          <Sparkle className="tinku-spark tinku-spark-b" size={17} />
        </div>
      )}
      <div className="tinku-stage">
        <img src={asset('tinku.png')} alt="Tinku, la mascota de Tinkuy" width={width} height={size} draggable={false} />
        {shadow && <span className="tinku-shadow" style={{ width: Math.round(size * 0.3125) }} />}
      </div>
    </div>
  );
}

function Sparkle({ className, size }: MarkProps & { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <path d="M12 1.5 13.8 9 21 12l-7.2 3L12 22.5 10.2 15 3 12l7.2-3z" fill="#e8c06a" />
    </svg>
  );
}

/**
 * Emblema del encabezado: madre y criatura bajo los rayos de color del logotipo.
 *
 * Sigue siendo vectorial porque el `image-slot` del diseño de inicio no trae una imagen que
 * se pueda leer entera desde la API. Se encaja centrado y el degradado del héroe cubre los
 * costados, igual que hace el propio `image-slot` con una imagen más estrecha que su marco.
 */
export function TinkuyEmblem({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 220 170" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="tk-emblem-glow" cx=".5" cy=".62" r=".62">
          <stop offset="0" stopColor="#8ea8ef" stopOpacity=".55" />
          <stop offset="1" stopColor="#8ea8ef" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tk-emblem-mother" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d8ee0" />
          <stop offset="1" stopColor="#31408a" />
        </linearGradient>
        <linearGradient id="tk-emblem-child" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe6c9" />
          <stop offset="1" stopColor="#f3c79b" />
        </linearGradient>
      </defs>

      <ellipse cx="110" cy="104" rx="104" ry="66" fill="url(#tk-emblem-glow)" />

      {/* Rayos de color: el desarrollo que se enciende cuando alguien acompaña a tiempo. */}
      <g strokeWidth="7" strokeLinecap="round" fill="none">
        <path d="M62 62c-6-13-5-26 2-33" stroke="#f6c445" />
        <path d="M84 46c-4-14 0-26 8-31" stroke="#ef7d4e" />
        <path d="M108 40c1-14 8-24 17-27" stroke="#e2609a" />
        <path d="M131 46c6-12 16-19 25-19" stroke="#9b7fd4" />
        <path d="M148 61c9-9 20-12 28-9" stroke="#49b6a8" />
      </g>

      {/* Madre */}
      <circle cx="84" cy="70" r="27" fill="url(#tk-emblem-mother)" />
      <path d="M36 170c0-26.5 21.5-48 48-48s48 21.5 48 48z" fill="url(#tk-emblem-mother)" />

      {/* Criatura. Va sobre un contorno del color del héroe: sin ese aire las dos siluetas se
          funden en un solo montículo y la escena deja de leerse como dos personas. */}
      <g stroke="#1d1540" strokeWidth="7" strokeLinejoin="round">
        <circle cx="142" cy="103" r="19" fill="url(#tk-emblem-child)" />
        <path d="M110 170c0-17.7 14.3-32 32-32s32 14.3 32 32z" fill="url(#tk-emblem-child)" />
      </g>

      {/* El punto de contacto: el brazo de la madre sosteniendo a la criatura. */}
      <path d="M96 140c10-9 23-12 35-9" stroke="#8ea8ef" strokeWidth="7" strokeLinecap="round" fill="none" opacity=".75" />
    </svg>
  );
}

/**
 * Marca de Tinkuy: la madre y el niño dentro del listón del encuentro.
 *
 * Va escrita a mano en vez de cargarse como archivo porque es lo único de la interfaz que no
 * puede fallar: preside el botón de vuelta al sitio y aparece antes que cualquier recurso de
 * `public/`. Es el mismo dibujo que `frontend/src/assets/tinkuy-mark.svg`; si se retoca uno,
 * hay que retocar el otro.
 */
export function TinkuyMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="tkm-madre" x1="16" y1="9" x2="34" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2f6fa8" />
          <stop offset="1" stopColor="#1a3d68" />
        </linearGradient>
        <linearGradient id="tkm-nino" x1="35" y1="21" x2="48" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5f9acb" />
          <stop offset="1" stopColor="#2f6fa8" />
        </linearGradient>
        <linearGradient id="tkm-liston" x1="10" y1="46" x2="54" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6ba3d0" />
          <stop offset=".5" stopColor="#37729f" />
          <stop offset="1" stopColor="#22527f" />
        </linearGradient>
      </defs>
      <path d="M12.97 39.87A21 21 0 0 0 51.73 23.82" fill="none" stroke="url(#tkm-liston)" strokeWidth="6.5" strokeLinecap="round" />
      <circle cx="24" cy="17" r="7.5" fill="url(#tkm-madre)" />
      <path d="M22.6 25.4C20.2 32 23.6 39.8 31.6 41.4" fill="none" stroke="url(#tkm-madre)" strokeWidth="7" strokeLinecap="round" />
      <circle cx="40" cy="26" r="5.5" fill="url(#tkm-nino)" />
      <path d="M44 30.2C46.1 33.6 45.6 37.6 42.6 39.6" fill="none" stroke="url(#tkm-nino)" strokeWidth="5" strokeLinecap="round" />
      <path d="M12.55 38h2.5v2.25h2.25v2.5h-2.25v2.25h-2.5v-2.25h-2.25v-2.5h2.25z" fill="#e6c56f" />
    </svg>
  );
}
