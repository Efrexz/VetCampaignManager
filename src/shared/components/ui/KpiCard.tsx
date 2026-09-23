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
  /** vegetal: brand color; neutral: quiet counts */
  tone?: 'vegetal' | 'neutral'
  className?: string
}) {
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
          tone === 'vegetal' ? 'text-vegetal' : 'text-ink-soft',
        )}
      >
        <span
          className={cn(
            'rounded-sm p-1',
            tone === 'vegetal' ? 'bg-vegetal-soft' : 'bg-mist-soft',
          )}
        >
          {icon}
        </span>
        {label}
      </span>
      <span className="font-mono tnum text-2xl font-semibold text-ink leading-none">
        {value}
      </span>
      {foot && <span className="text-2xs text-ink-mute">{foot}</span>}
    </Card>
  )
}
