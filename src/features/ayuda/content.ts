/**
 * Contents of the "Ayuda" page (/ayuda) shown to clinic staff.
 * Plain, non-technical Spanish (see AGENTS.md: UI es español, código en inglés).
 *
 * TO ADD A SCREENSHOT LATER:
 * 1. Save the PNG in `src/features/ayuda/assets/` (compress it: < 200 KB).
 * 2. Import it at the top of this file:  import pasoExcel from './assets/excel.png'
 * 3. Fill the item's `image` field: { src: pasoExcel, alt: '...', caption: '...' }
 * The page renders nothing (no empty slot) when `image` is absent, so the
 * section looks finished with or without captures.
 */

export interface FaqTip {
  text: string
  /** si = good practice (green), no = avoid (amber), info = neutral note. */
  kind?: 'si' | 'no' | 'info'
}

export interface FaqImage {
  src: string
  alt: string
  caption?: string
}

export interface FaqItem {
  id: string
  question: string
  /** 1–3 short paragraphs, non-technical. */
  paragraphs: string[]
  tips?: FaqTip[]
  image?: FaqImage
}

export interface FaqSection {
  id: string
  title: string
  tagline: string
  items: FaqItem[]
}

const SI = 'si' as const
const NO = 'no' as const
const INFO = 'info' as const

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: 'flujo',
    title: 'Cómo enviar una campaña',
    tagline: 'Solo 4 pasos, el mismo flujo siempre.',
    items: [
      {
        id: 'flujo-pasos',
        question: '¿Qué pasos sigo para mandar mensajes?',
        paragraphs: [
          'Entra con tu usuario, anda a "Campaña", sube el Excel que saca VetPraxis y revisa la lista.',
          'Marca quiénes deben recibir el mensaje y presiona "Enviar campaña" → "Confirmar".',
          'Una vez configurada la clínica (lo hace quien te instaló el sistema), tu único trabajo diario es: subir Excel → revisar → confirmar.',
        ],
        tips: [
          { text: 'El Excel es el mismo reporte de agendamientos de VetPraxis de siempre.', kind: INFO },
          { text: 'Nada se envía sin que aparezca la pantalla de confirmación: ahí puedes cancelar.', kind: SI },
        ],
      },
      {
        id: 'flujo-apagar',
        question: '¿Puedo mandar a algunos de la lista y no a todos?',
        paragraphs: [
          'Sí. En la revisión, cada fila tiene una casilla: desmarca al que no le toca hoy y ya no recibirá nada de esa campaña.',
          'Si un cliente NO desea recibir mas recordatorios, se debe registrar en "Clientes excluidos" y la app lo deja fuera para siempre (aparece con sello rojo "NO CONTACTAR").',
        ],
        tips: [
          { text: 'Un cliente desmarcado solo se salta ESTA campaña; el excluido se salta todas.', kind: INFO },
        ],
      },
    ],
  },
  {
    id: 'excel',
    title: 'El archivo Excel',
    tagline: 'Qué debe traer el archivo y qué significan las etiquetas de la revisión.',
    items: [
      {
        id: 'excel-columnas',
        question: '¿Qué columnas necesita el Excel?',
        paragraphs: [
          'La app lee del reporte de VetPraxis estas columnas: CLIENTE (nombre del dueño), MASCOTA, TELÉFONOS y TIPO DE EVENTO.',
          'Importante: no TODOS los reportes salen igual. Si lo descargas del día de agendados, ya viene con la columna "TIPO DE EVENTO". Pero si lo tomas de otra parte (historial de peluquería, historial de atención, etc.) puede venir escrita como "SERVICIOS" — en ese caso solo cambia el nombre de esa columna a "TIPO DE EVENTO" y listo.',
          'El TIPO DE EVENTO es quien decide qué plantilla se usa: el texto que aparece en esa columna para cada cliente debe coincidir con el nombre de una categoría (por ejemplo, si dice "Vacuna", se usará la plantilla de la categoría Vacuna). Por eso conviene usar palabras cortas y consistentes, igual que el nombre de las categorías.',
          'No cambies NADA más del Excel: ni columnas, ni orden, ni datos. Solo el nombre de esa columna cuando venga como "Servicios".',
        ],
        image: undefined,
      },
      {
        id: 'excel-sellos',
        question: '¿Qué significa lo de inválido, duplicado y excluido?',
        paragraphs: [
          'INVALIDADO: el número no parece celular de Perú (9 dígitos empezando en 9), o no hay número. Nunca se le escribe.',
          'DUPLICADO: el mismo cliente y servicio aparece más de una vez en el archivo; se le manda UN solo mensaje con el nombre de todas sus mascotas.',
          'EXCLUIDO: ese cliente está en la lista de "no contactar" (pidió que no le escriban). También cuenta lo de mensajes repetidos con poca distancia de tiempo.',
        ],
      },
    ],
  },
  {
    id: 'seguridad',
    title: 'Enviar con seguridad (evitar bloqueo de WhatsApp)',
    tagline: 'Las reglas de oro. Leerlas toma 2 minutos y evita dolores de cabeza.',
    items: [
      {
        id: 'seg-tamano',
        question: '¿Cuánto es mucho? Tamaño de cada campaña',
        paragraphs: [
          'La clave es CHICO y FRECUENTE, no grande y de golpe. WhatsApp sospecha cuando de repente salen decenas de mensajes idénticos desde un solo número.',
        ],
        tips: [
          { text: 'Ideal: grupos menores de 30 clientes por campaña.', kind: SI },
          { text: 'NUNCA mandes campañas de más de 50 clientes.', kind: NO },
        ],
      },
      {
        id: 'seg-espera',
        question: '¿Cada cuánto puedo mandar otra campaña?',
        paragraphs: [
          'La espera depende del tamaño de lo que apenas mandaste: si fue una campaña de MÁS de 15 clientes, espera alrededor de 1 hora y media antes de la siguiente. Con grupos chicos (menos de 15) basta con unos 20 minutos, y siempre verifica que la anterior ya terminó de salir.',
          'La app te ayuda: al presionar "Enviar campaña" dentro de esos 20 minutos aparece un aviso que te pide revisar el WhatsApp de la sede antes de continuar. Con tandas grandes es más estricto todavía.',
        ],
        tips: [
          { text: 'Campaña de más de 15 clientes → espera ~1 hora y media.', kind: SI },
          { text: 'Grupo chico (menos de 15) → ~20 min y confirma que ya terminó de salir.', kind: SI },
        ],
      },
      {
        id: 'seg-alterna',
        question: '¿Puedo mandar promociones varías veces seguidas?',
        paragraphs: [
          'Alterna el tipo de mensaje. Si mandaste dos campañas de promociones, que la siguiente sea de otra categoría (Vacuna, Antipulgas…) y recién después vuelve a promociones.',
        ],
        tips: [
          { text: 'Ejemplo: promociones → espera 1h30 → Antipulgas → espera 1h30 → promociones.', kind: INFO },
        ],
      },
      {
        id: 'seg-variantes',
        question: '¿El texto debe ser siempre el mismo?',
        paragraphs: [
          'No — y esto es importante. A cada plantilla se le pueden AGREGAR VARIANTES: el mismo mensaje con pequeñas diferencias (algunas palabras o emojis cambiados). Así ya no salen todos los mensajes idénticos.',
          'Cada sede edita sus propias plantillas y sus variantes en Ajustes → Plantillas (ábrele una y vas a ver dónde se agregan). El sistema reparte solo: a cada teléfono le asigna automáticamente una de las variantes (por eso en la revisión aparece "Versión A" o "Versión B").',
        ],
        tips: [
          { text: 'Mínimo 2 variantes por plantilla: un texto igual para todos es lo que da señales de bloqueo.', kind: NO },
        ],
      },
      {
        id: 'seg-stop',
        question: '¿Qué pasa si un cliente pide que no le escriban?',
        paragraphs: [
          'Se respeta al instante. Reportas el número al encargado (o lo registras en Ajustes → Clientes excluidos) y la app jamás lo volverá a contactar.',
          'Nunca insistas con un cliente que pidió silencio: es lo más grave que se puede hacer.',
        ],
      },
    ],
  },
  {
    id: 'revisar',
    title: 'La revisión antes de enviar',
    tagline: 'Qué mirar y qué significan los estados.',
    items: [
      {
        id: 'rev-estados',
        question: '¿Qué significa "Listo" y "Hace 2d por Baño"?',
        paragraphs: [
          '"Listo" = se puede enviar sin problema.',
          '"Hace 2d por Baño" = le escribimos por Baño hace 2 días, y los días de espera aún no pasan para el MISMO servicio, así que la fila aparece desmarcada.',
          'Un servicio DISTINTO nunca queda bloqueado por otro (la espera es por servicio, no global).',
        ],
        tips: [
          { text: 'Si de todas formas necesitas mandar esa fila, presiona "Forzar": es tu decisión consciente.', kind: INFO },
        ],
      },
      {
        id: 'rev-unidades',
        question: '¿Qué significa el número de "Mensajes" si es menor que las filas?',
        paragraphs: [
          'Los mensajes agrupan clientes con varios servicios o varias mascotas el mismo día: mejor UN mensaje con todo el detalle que tres seguidos. Los contadores de arriba de la revisión explican la diferencia.',
        ],
      },
    ],
  },
  {
    id: 'fallas',
    title: 'Si algo falla',
    tagline: 'Los errores que pueden salir en pantalla y qué hacer con cada uno.',
    items: [
      {
        id: 'falla-red',
        question: 'Salen "No se pudo enviar la campaña" o "Failed to fetch"',
        paragraphs: [
          'Casi siempre es la internet del local que falló en ese momento. Espera unos segundos y vuelve a intentar con calma, sin presionar el botón varias veces antes de saber qué pasó.',
        ],
        tips: [
          { text: 'Antes de reintentar, revisa el WhatsApp del PRIMER número de la lista: si ya le llegó el mensaje, NO reenvíes la campaña (duplicarías el mensaje).', kind: NO },
          { text: 'Si tu internet está inestable, prueba desde otra red (wifi del local ↔ datos del celular) antes de insistir.', kind: INFO },
        ],
      },
      {
        id: 'falla-tiempo',
        question: 'Dice "Tiempo de espera agotado"',
        paragraphs: [
          'El servidor se tardó en contestar. Igual que el caso anterior: espera un poco y reintenta siendo consciente de revisar el WhatsApp de un número antes de enviar de nuevo.',
        ],
      },
      {
        id: 'falla-ayuda',
        question: 'Nada funciona, ¿a quién le aviso?',
        paragraphs: [
          'Si el error sigue 15 minutos después, arma una captura de pantalla del error (o el texto completo del mensaje) y avísale al encargado para que lo revise. Así se corrige de una vez y no a medias.',
        ],
      },
    ],
  },
  {
    id: 'plantillas',
    title: 'Las plantillas de los mensajes',
    tagline: 'Cómo funciona el texto que se manda (cada sede edita las suyas).',
    items: [
      {
        id: 'tpl-variables',
        question: '¿Por qué el mensaje dice "Hola María" y no el nombre completo?',
        paragraphs: [
          'A propósito: el mensaje saluda con el PRIMER nombre para sonar más natural. El cliente también ve el nombre de su mascota y el motivo del mensaje en el mismo texto.',
        ],
        tips: [
          { text: 'Si dos clientes se llaman igual en la misma lista, el teléfono correcto igualmente se respeta: el mensaje sale por número.', kind: INFO },
        ],
      },
      {
        id: 'tpl-variantes-leyenda',
        question: '¿Qué son las "Versión A / Versión B"?',
        paragraphs: [
          'Son las variantes. La revisión te muestra qué versión recibirá cada mensaje — el sistema lo asigna solo por número de teléfono, no lo cambies a mano.',
        ],
      },
      {
        id: 'tpl-editar',
        question: '¿Quiero cambiar la redacción de un mensaje, qué hago?',
        paragraphs: [
          'Todo el texto se edita en Ajustes → Plantillas, donde cada sede tiene las suyas: puedes cambiar la redacción, agregar variantes y de ahí queda para los próximos envíos.',
          'Excepción: si necesitas escribirle a UN cliente en particular con un texto distinto, no lo metas en la campaña — escríbele directo por WhatsApp.',
        ],
      },
    ],
  },
  {
    id: 'panel',
    title: 'Historial y resultados',
    tagline: 'Dónde ver lo ya enviado y entender los números del panel.',
    items: [
      {
        id: 'panel-historial',
        question: '¿Dónde veo lo que ya se mandó?',
        paragraphs: [
          'En "Historial": cada campaña con su fecha, la sede, cuántos mensajes salieron y cuántos quedaron protegidos. Toca una fila para ver el detalle.',
        ],
      },
      {
        id: 'panel-metricas',
        question: '¿Qué son los "Protegidos" del panel?',
        paragraphs: [
          'Son los contactos que la app NO envió: números inválidos, repetidos, excluidos o en espera.',
        ],
      },
      {
        id: 'panel-rango',
        question: '¿Qué muestran "14 días", "Últimos 30 días" y "6 meses"?',
        paragraphs: [
          'El panel muestra tu trabajo por rangos: los últimos 14 días (por defecto), los últimos 30 días, o mes a mes. En "6 meses" puedes tocar un mes y ver sus días uno por uno.',
        ],
      },
    ],
  },
]
