import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'vegetal' | 'clay' | 'danger' | 'warn'

const tones: Record<Tone, string> = {
  neutral: 'bg-mist-soft text-ink-soft border-mist',
  vegetal: 'bg-vegetal-soft text-vegetal border-vegetal/20',
  clay: 'bg-clay-soft text-clay border-clay/20',
  danger: 'bg-danger-soft text-danger border-danger/20',
  warn: 'bg-warn-soft text-warn border-warn/20',
}

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Chip({ tone = 'neutral', className, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-xs font-medium border',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}