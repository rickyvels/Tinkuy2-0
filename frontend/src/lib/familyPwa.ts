import type { AnchorHTMLAttributes } from "react"

/**
 * Enlace al portal familiar.
 *
 * La PWA familiar es una aplicación aparte, con su propio origen, así que el
 * enlace sale del enrutador: es un `<a>`, no un `<Link>`.
 *
 * `VITE_FAMILY_PWA_URL` es la URL de ese despliegue. Cuando no está definida
 * —el caso por defecto, y el único posible mientras la PWA no esté publicada—
 * el enlace lleva al acceso familiar de esta misma aplicación en lugar de
 * quedarse muerto.
 */

/** Acceso familiar dentro de esta aplicación. Ver `AppRoutes`. */
const IN_APP_FAMILY_ACCESS = "/acceso"

const configuredUrl = (import.meta.env.VITE_FAMILY_PWA_URL as string | undefined)?.trim()

export const familyPwaLinkProps: AnchorHTMLAttributes<HTMLAnchorElement> = configuredUrl
  ? { href: configuredUrl, target: "_blank", rel: "noopener noreferrer" }
  : { href: IN_APP_FAMILY_ACCESS }
