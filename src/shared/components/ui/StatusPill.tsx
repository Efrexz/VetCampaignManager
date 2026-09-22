/**
 * Status pill with a color dot, used for campaign state across tables
 * ("Enviada" / "Falló"). Demo sends are flagged separately by callers.
 */
import { cn } from '@/lib/cn'

export type StatusPillTone = 'sent' | 'failed'

const TONE_CLS: Record<StatusPillTone, string> = {
  sent: 'bg-vegetal-soft text-vegetal',
  failed: 'bg-danger-soft text-danger',
}

const DOT_CLS: Record<StatusPillTone, string> = {
  sent: 'bg-vegetal',
  failed: 'bg-danger',
}

export function StatusPill({
  tone,
  label,
  title,
  className,
}: {
  tone: StatusPillTone
  label: string
  title?: string
  className?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-medium whitespace-nowrap',
        TONE_CLS[tone],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT_CLS[tone])} />
      {label}
    </span>
  )
}
