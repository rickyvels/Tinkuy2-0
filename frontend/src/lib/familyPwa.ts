import type { AnchorHTMLAttributes } from "react"

/**
 * Enlace a la PWA familiar (`apps/family-pwa`).
 *
 * Es otra aplicación —otro bundle, con su propio service worker—, así que el
 * enlace sale del enrutador: es un `<a>`, no un `<Link>`.
 *
 * El despliegue publica las dos bajo el mismo dominio: este sitio en la raíz y
 * la PWA en `/pwa/` (ver `scripts/build-site.mjs`). Compartir origen es lo que
 * permite que la ruta relativa de abajo funcione sin conocer el dominio, y que
 * la PWA llame a `/api/v1` sin CORS.
 *
 * `VITE_FAMILY_PWA_URL` sigue existiendo para el caso en que la PWA se aloje
 * aparte; cuando está definida, gana y el enlace abre en pestaña nueva.
 */

/** Ruta de la PWA familiar dentro de este mismo despliegue. */
const SAME_ORIGIN_FAMILY_PWA = "/pwa/"

const configuredUrl = (import.meta.env.VITE_FAMILY_PWA_URL as string | undefined)?.trim()

export const familyPwaLinkProps: AnchorHTMLAttributes<HTMLAnchorElement> = configuredUrl
  ? { href: configuredUrl, target: "_blank", rel: "noopener noreferrer" }
  : { href: SAME_ORIGIN_FAMILY_PWA }
