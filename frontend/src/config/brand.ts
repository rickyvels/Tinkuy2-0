/**
 * Identidad de la aplicación en un solo lugar.
 *
 * `Tinkuy` significa "encuentro" en quechua: el encuentro entre la familia, el
 * primer nivel de atención y el equipo especializado.
 *
 * Las claves de almacenamiento siguen usando el prefijo `neuroalianza.` a
 * propósito: renombrarlas dejaría fuera el avance ya guardado en los
 * navegadores que estén probando la demo.
 */

import logoUrl from "@/assets/tinkuy-mark.svg"

export const BRAND_NAME = "Tinkuy"

/** Se resalta en la segunda mitad del nombre, como hacía la marca anterior. */
export const BRAND_NAME_PARTS = { lead: "Tin", accent: "kuy" } as const

export const BRAND_TAGLINE = "Neurodesarrollo INSN San Borja"

/**
 * Logotipo oficial: la madre y el niño dentro del listón del encuentro. Vive
 * como SVG para que aguante cualquier tamaño —desde los 24 px del header hasta
 * un favicon— sin pesar ni pixelarse. `BrandMark` lo usa en cuanto no es nulo.
 */
export const LOGO_SRC: string | null = logoUrl
