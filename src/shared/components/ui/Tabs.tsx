/**
 * Pill-style tabs: every tab its own chip; the active one fills in paper
 * with the card shadow. Sweeps a lighter look than an underline row.
 *
 * Segmented: compact single-track switcher (used by the dashboard ranges)
 * with the vegetal active pill.
 */
import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn('inline-flex items-center gap-1 flex-wrap', className)}
    >
      {items.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3.5 h-9 text-sm transition-colors',
              active
                ? 'bg-paper text-ink font-medium border border-mist shadow-card'
                : 'text-ink-soft hover:bg-mist-soft/70 hover:text-ink',
            )}
          >
            {t.icon && (
              <span className={active ? 'text-vegetal' : 'text-ink-mute'}>
                {t.icon}
              </span>
            )}
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

export function Segmented({ value, onChange, options, className }: {
  value: string
  onChange: (id: string) => void
  options: { id: string; label: string }[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md bg-mist-soft p-0.5',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              'rounded-sm px-3 h-7 text-xs transition-colors',
              active
                ? 'bg-vegetal text-paper font-medium'
                : 'text-ink-soft hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
