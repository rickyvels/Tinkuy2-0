import type { AnchorHTMLAttributes } from "react"

/**
 * Enlaces a las otras dos aplicaciones del despliegue.
 *
 * Cada una es una SPA independiente, con su propio bundle y su propio enrutador, así que se
 * abren con un `<a>` y no con un `<Link>`: pasar por el enrutador de esta aplicación daría un
 * 404 en lugar de cargarlas.
 *
 * En el despliegue de un solo dominio viven bajo estos prefijos del mismo origen, que es lo
 * que ensambla `scripts/build-web.mjs`. Las variables permiten apuntar a un origen aparte sin
 * recompilar la portada entera.
 */

const DEFAULT_FAMILY_PWA = "/familia/"
const DEFAULT_PLATFORM = "/pro/"

function linkTo(configured: string | undefined, fallback: string): AnchorHTMLAttributes<HTMLAnchorElement> {
  const href = configured?.trim() || fallback
  // Una URL absoluta apunta a otro origen y se abre en una pestaña nueva; el prefijo local
  // sustituye a la portada, que es lo que espera quien pulsa «Abrir Aplicación».
  return /^https?:\/\//i.test(href)
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : { href }
}

/** PWA familiar (`apps/family-pwa`). */
export const familyPwaLinkProps = linkTo(
  import.meta.env.VITE_FAMILY_PWA_URL as string | undefined,
  DEFAULT_FAMILY_PWA,
)

/** Plataforma profesional (`apps/platform`), para personal médico y administrativo. */
export const platformLinkProps = linkTo(
  import.meta.env.VITE_PLATFORM_URL as string | undefined,
  DEFAULT_PLATFORM,
)
