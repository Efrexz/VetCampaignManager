/**
 * Help page (/ayuda): the newcomers' "Preguntas frecuentes". Accordion-style
 * items (click to expand), organized in themed sections. Content lives in
 * content.ts (static, non-technical Spanish). Optional screenshots per item
 * (see content.ts header for how to add them).
 *
 * Kept simple on purpose: native <details>/<summary> + tokens, no accordion
 * library, no state beyond "which items are open" (multi-open allowed).
 */
import { useState } from 'react'
import {
  CircleHelp,
  ChevronDown,
  ShieldAlert,
  FileSpreadsheet,
  ListChecks,
  WifiOff,
  MessageSquareText,
  LayoutDashboard,
  Check,
  X,
  Info,
} from 'lucide-react'
import type { FaqImage, FaqItem, FaqTip } from './content'
import { FAQ_SECTIONS } from './content'

/** Icon per section id. Update when adding a section. */
const SECTION_ICONS: Record<string, typeof CircleHelp> = {
  flujo: CircleHelp,
  excel: FileSpreadsheet,
  seguridad: ShieldAlert,
  revisar: ListChecks,
  fallas: WifiOff,
  plantillas: MessageSquareText,
  panel: LayoutDashboard,
}

export function Ayuda() {
  /** Open items across sections (ids are unique across the whole page). */
  const [open, setOpen] = useState<Set<string>>(() => new Set())

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const total = FAQ_SECTIONS.reduce((n, s) => n + s.items.length, 0)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-rise">
      <header className="flex items-center gap-3">
        <span className="rounded-md bg-vegetal-soft text-vegetal p-2.5 shrink-0">
          <CircleHelp size={20} />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-ink tracking-tight">
            Preguntas frecuentes
          </h1>
          <p className="text-sm text-ink-soft leading-snug">
            {total} respuestas cortas sobre el día a día en la app — sin
            tecnicismos.
          </p>
        </div>
      </header>

      {/* The safety rules get a highlighted card up front */}
      <SafetySummary
        onOpen={() => {
          setOpen((prev) => {
            const next = new Set(prev)
            for (const item of FAQ_SECTIONS.find((s) => s.id === 'seguridad')!.items)
              next.add(item.id)
            return next
          })
          document
            .getElementById('seguridad')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      />

      {FAQ_SECTIONS.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="scroll-mt-6 space-y-2"
        >
          <div className="flex items-baseline gap-2 px-1">
            {(() => {
              const Icon = SECTION_ICONS[section.id] ?? CircleHelp
              return (
                <span className="text-vegetal translate-y-0.5">
                  <Icon size={15} />
                </span>
              )
            })()}
            <h2 className="text-md font-semibold text-ink">{section.title}</h2>
            <span className="text-xs text-ink-mute truncate">
              {section.tagline}
            </span>
          </div>
          <div className="space-y-2">
            {section.items.map((item) => (
              <FaqCard
                key={item.id}
                item={item}
                open={open.has(item.id)}
                onToggle={() => toggle(item.id)}
              />
            ))}
          </div>
        </section>
      ))}

      <p className="text-2xs text-ink-mute text-center pt-2">
        ¿Falta algo que te gustaría ver aquí? Dile al encargado de tu clínica
        — esta guía crece con sus comentarios.
      </p>
    </div>
  )
}

/** Highlighted up-front card with the send-safety essentials (anti-ban). */
function SafetySummary({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="rounded-md border border-warn/40 bg-warn-soft/40 p-4">
      <p className="text-sm font-medium text-ink flex items-center gap-2">
        <ShieldAlert size={15} className="text-warn shrink-0" />
        Protege el WhatsApp de la clínica — las 3 reglas de oro
      </p>
      <ul className="mt-2 space-y-1 text-sm text-ink-soft list-none">
        <li>
          <strong className="text-ink">Chico:</strong> grupos de menos de 30
          clientes. Nunca más de 50.
        </li>
        <li>
          <strong className="text-ink">Con pausa:</strong> ~1 hora y media entre
          una campaña y la siguiente.
        </li>
        <li>
          <strong className="text-ink">Variado:</strong> mínimo 2 variantes de
          texto y alterna categorías entre campañas.
        </li>
      </ul>
      <button
        type="button"
        onClick={onOpen}
        className="mt-2.5 text-xs font-medium text-warn hover:text-ink transition-colors"
      >
        Ver la sección completa ↓
      </button>
    </div>
  )
}

/** One accordion row: question in the summary, answer + tips + capture inside. */
function FaqCard({
  item,
  open,
  onToggle,
}: {
  item: FaqItem
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-md border border-mist bg-paper shadow-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-ink hover:bg-mist-soft/40 transition-colors"
      >
        <span>{item.question}</span>
        <ChevronDown
          size={15}
          className={`text-ink-mute shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-mist/60">
          {item.paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-ink-soft leading-relaxed">
              {p}
            </p>
          ))}
          {item.tips && item.tips.length > 0 && (
            <ul className="space-y-1.5">
              {item.tips.map((tip, i) => (
                <FaqTipRow key={i} tip={tip} />
              ))}
            </ul>
          )}
          {item.image && <FaqImageFigure image={item.image} />}
        </div>
      )}
    </div>
  )
}

/** A single do/don't tip row with its kind icon + color. */
function FaqTipRow({ tip }: { tip: FaqTip }) {
  const kind = tip.kind ?? 'info'
  if (kind === 'si') {
    return (
      <li className="flex items-start gap-2 text-sm text-ink">
        <span className="rounded-sm bg-vegetal-soft text-vegetal p-0.5 shrink-0 mt-0.5">
          <Check size={11} />
        </span>
        {tip.text}
      </li>
    )
  }
  if (kind === 'no') {
    return (
      <li className="flex items-start gap-2 text-sm text-ink">
        <span className="rounded-sm bg-danger-soft text-danger p-0.5 shrink-0 mt-0.5">
          <X size={11} />
        </span>
        {tip.text}
      </li>
    )
  }
  return (
    <li className="flex items-start gap-2 text-sm text-ink-soft">
      <span className="rounded-sm bg-mist-soft text-ink-mute p-0.5 shrink-0 mt-0.5">
        <Info size={11} />
      </span>
      <span className="text-ink-soft">{tip.text}</span>
    </li>
  )
}

/** Optional capture slot per item — rendered only when the item defines one. */
function FaqImageFigure({ image }: { image: FaqImage }) {
  return (
    <figure className="max-w-lg pt-1">
      <img
        src={image.src}
        alt={image.alt}
        loading="lazy"
        className="w-full rounded-md border border-mist"
      />
      {image.caption && (
        <figcaption className="text-2xs text-ink-mute mt-1.5 text-center">
          {image.caption}
        </figcaption>
      )}
    </figure>
  )
}
