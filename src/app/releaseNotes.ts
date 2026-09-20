/**
 * Release notes shown to clinic staff (receptionists) via the "Novedades"
 * bell in the TopBar. Written in plain, non-technical Spanish.
 *
 * MAINTENANCE RULE (also documented in AGENTS.md):
 * every deployment that affects how receptionists work — a new feature,
 * a benefit, or a workflow change — adds one entry here in the SAME commit.
 * Latest first. `relevant: true` entries trigger the "unread" badge and the
 * one-time startup toast.
 */

export interface ReleaseEntry {
  /** Ordered id (ISO date). Never reuse — visibility is tracked by id. */
  id: string
  /** Human date, e.g. "19 de septiembre, 2026". */
  date: string
  /** Short friendly title. */
  title: string
  /** 2–4 plain bullets: what changed, what they gain, how to work now. */
  items: string[]
  /** True when it changes how they work (drives badge + toast). */
  relevant: boolean
}

export const RELEASE_NOTES: ReleaseEntry[] = [
  {
    id: '2026-09-19',
    date: '19 de septiembre, 2026',
    title: 'Mensajes sin repeticiones 🐾',
    relevant: true,
    items: [
      'Si un cliente tiene varias mascotas agendadas para el mismo servicio, el mensaje ahora nombra a TODAS ("Roco y Maxi"), en vez de descartarse como duplicado.',
      'Si una mascota tiene dos servicios distintos el mismo día, se avisa solo uno: el doctor comenta el resto en la consulta. No se envían mensajes seguidos al mismo cliente.',
      'En la revisión verás el estado sin necesidad de pasar el mouse: "Listo" o "Hace 2d por Baño" (el servicio, la fecha y si conviene forzarlo).',
      'Nosotros (la clínica) decidimos cuántos días esperar entre mensajes en Ajustes → Conexión. Antes era un tiempo fijo.',
    ],
  },
]
