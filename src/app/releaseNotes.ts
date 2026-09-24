/**
 * Release notes shown to clinic staff (receptionists) via the "Novedades"
 * bell in the TopBar. Written in plain, non-technical Spanish.
 *
 * MAINTENANCE RULE (also documented in AGENTS.md):
 * every deployment that affects how receptionists WORK — a new feature,
 * a benefit, or a workflow change — adds one entry here in the SAME commit
 * with `relevant: true` (drives badge + one-time toast). Pure visual/cosmetic
 * changes go in as `relevant: false` entries with a single short bullet.
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
    id: '2026-09-23',
    date: '23 de septiembre, 2026',
    title: 'Cambios visuales',
    relevant: false,
    items: [
      'Renovamos la página de inicio: el resumen muestra los últimos 14 días por defecto, y las listas de campañas e historial ahora tienen un look más limpio con sellos de color.',
      'La pantalla de importación ahora muestra un ejemplo del Excel que debe traer VetPraxis, para que sea más fácil entender qué archivo subir.',
      'La sección Ajustes también se renovó visualmente: pestañas y tarjetas más legibles, y ahora cada categoría indica cuántas plantillas tiene asociadas.',
      'El resumen después de importar el Excel y la pantalla de acceso se diseñaron con el mismo estilo nuevo — más claras de leer.',
    ],
  },
  {
    id: '2026-09-21',
    date: '21 de septiembre, 2026',
    title: 'Cuidamos tu WhatsApp 🛡️',
    relevant: true,
    items: [
      'Si vas a enviar una campaña grande (más de 50 mensajes), la app te avisa antes con una recomendación de enviar por partes — reduce el riesgo de que WhatsApp bloquee el número de la clínica.',
      'Las plantillas ahora pueden tener variaciones (las configura el encargado): los mensajes ya no salen todos idénticos, y eso también baja el riesgo.',
    ],
  },
  {
    id: '2026-09-20-2',
    date: '20 de septiembre, 2026',
    title: 'Clientes vetados y login más claro 🔕',
    relevant: true,
    items: [
      'Nueva pestaña Ajustes → Clientes excluidos: ahí se apunta a los clientes donde no se debe escribir nunca (con su nota del motivo). En la revisión aparecen con sello rojo "NO CONTACTAR" y no se les puede enviar.',
      'Si un cliente tiene varios números, se pueden registrar todos juntos: aunque aparezca cualquier número en un Excel futuro, ese mensaje no sale.',
      'El botón "Crear cuenta" ya no aparece en el inicio de sesión: las cuentas las crea el administrador. Si a alguien le falta acceso, se lo pide al encargado.',
    ],
  },
  {
    id: '2026-09-17',
    date: '17 de septiembre, 2026',
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
