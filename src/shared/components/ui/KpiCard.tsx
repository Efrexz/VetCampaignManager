/**
 * Large headline card used by the dashboard KPI row and the send-confirmation
 * screen. Icon chip + label + mono value (+ optional foot note).
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Card } from './Card'

export function KpiCard({
  icon,
  label,
  value,
  foot,
  tone = 'vegetal',
  className,
}: {
  icon: ReactNode
  label: string
  value: string | number
  foot?: string
  /** Icon/label tone: brand (vegetal), quiet counts (neutral), problems. */
  tone?: 'vegetal' | 'neutral' | 'danger' | 'warn'
  className?: string
}) {
  const toneCls = {
    vegetal: { label: 'text-vegetal', chip: 'bg-vegetal-soft' },
    neutral: { label: 'text-ink-soft', chip: 'bg-mist-soft' },
    danger: { label: 'text-danger', chip: 'bg-danger-soft' },
    warn: { label: 'text-warn', chip: 'bg-warn-soft' },
  }[tone]
  return (
    <Card
      className={cn(
        'p-4 flex flex-col gap-2 transition-shadow hover:shadow-card-hover',
        className,
      )}
    >
      <span
        className={cn(
          'flex items-center gap-2 text-2xs uppercase tracking-wide',
          toneCls.label,
        )}
      >
        <span className={cn('rounded-sm p-1', toneCls.chip)}>{icon}</span>
        {label}
      </span>
      <span className="font-mono tnum text-2xl font-semibold text-ink leading-none">
        {value}
      </span>
      {foot && <span className="text-2xs text-ink-mute">{foot}</span>}
    </Card>
  )
}
