/**
 * Horizontal month rows (plain CSS): one row per month, click to zoom the
 * dashboard into that month. Mirrors the dashboard card language: mist track,
 * vegetal bars, hover elevation and clear tap affordance only when the month
 * has data.
 */
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Card } from '@/shared/components/ui'
import { type MonthBucket } from '@/lib/stats'

function fmt(n: number): string {
  return n.toLocaleString('es-PE')
}

export function MonthBarsCard({ title, months, selectedKey, onSelect }: {
  title: string
  months: MonthBucket[]
  selectedKey: string | null
  onSelect: (key: string) => void
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const maxMessages = Math.max(1, ...months.map((m) => m.totals.messages))
  const totalMessages = months.reduce((n, m) => n + m.totals.messages, 0)
  const totalCampaigns = months.reduce((n, m) => n + m.totals.campaigns, 0)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div>
          <p className="text-sm text-ink-soft">{title}</p>
          <p className="text-2xs text-ink-mute mt-0.5">
            Haz clic en un mes para ver su detalle día a día.
          </p>
        </div>
        <span className="text-2xs text-ink-mute tnum">
          Semestre:{' '}
          <span className="font-mono font-semibold text-ink">
            {fmt(totalMessages)}
          </span>{' '}
          mensajes ·{' '}
          <span className="font-mono font-semibold text-ink">
            {fmt(totalCampaigns)}
          </span>{' '}
          campañas
        </span>
      </div>

      <div className="space-y-1.5">
        {months.map((m) => {
          const active = m.key === selectedKey
          const hovered = m.key === activeKey
          const empty = m.totals.messages === 0
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onSelect(m.key)}
              disabled={empty}
              onMouseEnter={() => setActiveKey(m.key)}
              onMouseLeave={() => setActiveKey(null)}
              onFocus={() => setActiveKey(m.key)}
              onBlur={() => setActiveKey(null)}
              title={empty ? `${m.label} · sin campañas` : `Ver ${m.label} en detalle`}
              className={cn(
                'group w-full flex items-center gap-3 rounded-md px-3 py-2 text-left',
                'transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-vegetal/40',
                active
                  ? 'bg-vegetal-soft/70'
                  : empty
                    ? 'opacity-60 cursor-default'
                    : 'cursor-pointer hover:bg-mist-soft/60',
                activeKey !== null && !hovered && !active && 'opacity-45',
              )}
            >
              <span
                className={cn(
                  'text-xs w-24 shrink-0',
                  active ? 'text-vegetal font-semibold' : 'text-ink font-medium',
                )}
              >
                {m.label}
              </span>
              <div className="flex-1 h-4 rounded-sm bg-mist-soft/70 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-sm transition-colors',
                    active
                      ? 'bg-vegetal'
                      : hovered
                        ? 'bg-vegetal/90'
                        : 'bg-vegetal/60 group-hover:bg-vegetal/75',
                  )}
                  style={{ width: `${(m.totals.messages / maxMessages) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono tnum text-ink w-20 text-right shrink-0">
                {fmt(m.totals.messages)} msj
              </span>
              <span className="text-2xs text-ink-mute w-16 text-right shrink-0 tnum">
                {m.totals.campaigns} camp.
              </span>
              <ChevronRight
                size={14}
                className={cn(
                  'shrink-0 transition-colors',
                  empty
                    ? 'text-mist'
                    : active
                      ? 'text-vegetal'
                      : 'text-ink-mute group-hover:text-vegetal',
                )}
              />
            </button>
          )
        })}
      </div>
    </Card>
  )
}
