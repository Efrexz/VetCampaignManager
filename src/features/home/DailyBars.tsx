/**
 * Vertical daily bars (plain CSS, no chart library): one column per day.
 * Hover / keyboard focus on a column reveals its number and a floating
 * tooltip card with the day's numbers (mockup style). Used by the dashboard
 * for the 14-day / month / selected-month views.
 */
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Card } from '@/shared/components/ui'
import { dayFullLabel, type DayBucket } from '@/lib/stats'

function fmt(n: number): string {
  return n.toLocaleString('es-PE')
}

export function DailyBarsCard({ title, buckets }: {
  title: string
  buckets: DayBucket[]
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const maxMessages = Math.max(1, ...buckets.map((b) => b.totals.messages))
  const peak = [...buckets].sort((a, b) => b.totals.messages - a.totals.messages)[0]
  const active = buckets.find((b) => b.key === activeKey) ?? null

  return (
    <Card className="p-5">
      <p className="text-sm text-ink-soft mb-4 flex items-center justify-between gap-2 flex-wrap">
        <span>{title}</span>
        {peak && peak.totals.messages > 0 && (
          <span className="text-2xs text-ink-mute tnum">
            Mejor día: <span className="text-ink-soft">{dayFullLabel(peak.key)}</span>{' '}
            · {fmt(peak.totals.messages)} msj
          </span>
        )}
      </p>

      <div className="relative">
        {/* Floating tooltip for the hovered day */}
        {active && (
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-full pb-2 pointer-events-none"
            style={{
              left: `${(buckets.findIndex((b) => b.key === active.key) + 0.5) / buckets.length * 100}%`,
            }}
          >
            <div className="rounded-md bg-paper border border-mist shadow-card px-3 py-2 whitespace-nowrap">
              <p className="text-2xs font-semibold text-ink">
                {dayFullLabel(active.key)}
              </p>
              <p className="text-2xs text-ink-soft tnum mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-vegetal" />
                {fmt(active.totals.messages)} mensajes · {active.totals.campaigns} camp.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-end gap-1.5 h-44">
          {buckets.map((b) => {
            const pct = (b.totals.messages / maxMessages) * 100
            const isMax = b.key === peak?.key && b.totals.messages > 0
            const isActive = b.key === activeKey
            const showNum = b.totals.messages > 0 && isActive
            const dimmed = activeKey !== null && !isActive
            return (
              <div
                key={b.key}
                role="img"
                aria-label={`${dayFullLabel(b.key)}: ${b.totals.messages} mensajes`}
                tabIndex={0}
                onMouseEnter={() => setActiveKey(b.key)}
                onMouseLeave={() => setActiveKey(null)}
                onFocus={() => setActiveKey(b.key)}
                onBlur={() => setActiveKey(null)}
                className={cn(
                  'flex-1 h-full flex flex-col items-center min-w-0 rounded-sm outline-none',
                  'focus-visible:ring-1 focus-visible:ring-vegetal/40 transition-opacity',
                  dimmed && 'opacity-45',
                )}
              >
                <span className="text-2xs font-mono tnum text-ink-soft h-4 leading-4">
                  {showNum ? fmt(b.totals.messages) : ''}
                </span>
                <div className="w-full flex-1 rounded-sm bg-mist-soft/50 flex items-end overflow-hidden">
                  <div
                    className={cn(
                      'w-full rounded-sm transition-colors duration-150',
                      isActive
                        ? 'bg-vegetal'
                        : isMax
                          ? 'bg-vegetal'
                          : 'bg-vegetal/55',
                    )}
                    style={{
                      height: `${Math.max(pct, 2)}%`,
                      opacity: b.totals.messages > 0 ? 1 : 0.25,
                    }}
                  />
                </div>
                <span
                  className={cn(
                    'text-2xs mt-1 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center',
                    isActive ? 'text-ink font-medium' : 'text-ink-mute',
                  )}
                >
                  {b.totals.messages > 0 ? b.label : b.label.split(' ')[0]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
