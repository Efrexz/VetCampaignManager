import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        'flex gap-1 border-b border-mist',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative px-3 py-2 text-sm transition-colors',
              'inline-flex items-center gap-2',
              active
                ? 'text-ink font-medium'
                : 'text-ink-mute hover:text-ink',
            )}
          >
            {item.icon}
            {item.label}
            {active && (
              <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-vegetal rounded-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}

// Segmented control variant for compact toggles
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: ReactNode }[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="inline-flex rounded-sm border border-mist bg-paper p-0.5">
      {options.map((opt) => {
        const active = opt.id === value
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              'px-3 h-7 text-xs rounded-sm transition-colors',
              active
                ? 'bg-vegetal text-paper font-medium'
                : 'text-ink-mute hover:text-ink',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}