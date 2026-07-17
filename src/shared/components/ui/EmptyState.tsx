import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className,
      )}
    >
      {icon && (
        <div className="mb-3 rounded-md bg-mist-soft p-3 text-ink-mute">
          {icon}
        </div>
      )}
      <h3 className="text-md font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-ink-soft max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}