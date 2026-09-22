/**
 * Hero illustration (pure CSS/SVG, no external assets): a WhatsApp-style
 * message bubble demoing the actual product output, floating bubbles and a
 * subtle paw-print pattern. Rises on the right side of the Home hero card.
 */
import { MessageCircle } from 'lucide-react'

const PAWS = [
  { top: '8%', right: '12%', size: 14, rot: 20 },
  { top: '30%', right: '3%', size: 10, rot: -15 },
  { top: '68%', right: '16%', size: 16, rot: 45 },
  { top: '86%', right: '30%', size: 10, rot: -30 },
  { top: '18%', right: '38%', size: 9, rot: 100 },
  { top: '78%', right: '60%', size: 12, rot: 15 },
]

function Paw({ top, right, size, rot }: { top: string; right: string; size: number; rot: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="absolute text-vegetal/10"
      style={{ top, right, width: size, height: size, transform: `rotate(${rot}deg)` }}
      aria-hidden="true"
    >
      <ellipse cx="12" cy="15.5" rx="5" ry="4" />
      <circle cx="7" cy="9" r="2.4" />
      <circle cx="12" cy="7" r="2.4" />
      <circle cx="17" cy="9" r="2.4" />
    </svg>
  )
}

export function HeroArt() {
  return (
    <div className="relative h-full min-h-44 overflow-hidden rounded-md bg-vegetal-soft/60">
      {PAWS.map((p, i) => (
        <Paw key={i} {...p} />
      ))}

      <div className="absolute inset-0 flex items-center justify-center p-5">
        <div className="w-full max-w-64 space-y-2">
          {/* Outgoing message — the real product output */}
          <div className="ml-auto max-w-fit rounded-sm rounded-br-none bg-vegetal px-3 py-2.5 shadow-card">
            <p className="text-xs leading-snug text-paper">
              ¡Hola Sofía! 🐾 Le recordamos que <strong>Luna</strong> tiene su cita
              de <strong>vacuna</strong> mañana. ¡Los esperamos!
            </p>
            <p className="mt-1 text-right text-2xs text-paper/60 tnum">11:40 ✓✓</p>
          </div>

          {/* Reply bubble */}
          <div className="max-w-fit rounded-sm rounded-bl-none bg-paper px-3 py-2.5 shadow-card border border-mist">
            <p className="text-2xs text-ink-soft leading-snug">
              Listo. ¡Gracias! 🙌
            </p>
          </div>

          <div className="flex items-center gap-1.5 pl-1 pt-1 text-2xs text-vegetal">
            <MessageCircle size={11} />
            Recordatorios que llegan a tiempo
          </div>
        </div>
      </div>
    </div>
  )
}
