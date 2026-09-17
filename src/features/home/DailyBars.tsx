/**
 * Vertical daily bars (plain CSS, no chart library): one column per day,
 * peak day highlighted and labelled. Used by the dashboard for the
 * week / month / selected-month views.
 */
import { Card } from '@/shared/components/ui'
import { dayFullLabel, type DayBucket } from '@/lib/stats'

function fmt(n: number): string {
  return n.toLocaleString('es-PE')
}

export function DailyBarsCard({ title, buckets, showValues }: {
  title: string
  buckets: DayBucket[]
  showValues: boolean
}) {
  const maxMessages = Math.max(1, ...buckets.map((b) => b.totals.messages))
  const peak = [...buckets].sort((a, b) => b.totals.messages - a.totals.messages)[0]
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
      <div className="flex items-end gap-1.5 h-44">
        {buckets.map((b) => {
          const pct = (b.totals.messages / maxMessages) * 100
          const isMax = b === peak
          const showNum = b.totals.messages > 0 && (showValues || isMax)
          return (
            <div
              key={b.key}
              className="flex-1 h-full flex flex-col items-center min-w-0"
              title={`${dayFullLabel(b.key)} · ${fmt(b.totals.messages)} msj (${b.totals.campaigns} camp.)`}
            >
              <span className="text-2xs font-mono tnum text-ink-soft h-4 leading-4">
                {showNum ? fmt(b.totals.messages) : ''}
              </span>
              <div className="w-full flex-1 rounded-sm bg-mist-soft/50 flex items-end overflow-hidden">
                <div
                  className={`w-full rounded-sm transition-[height] duration-300 ${
                    isMax && b.totals.messages > 0 ? 'bg-vegetal' : 'bg-vegetal/55'
                  }`}
                  style={{
                    height: `${Math.max(pct, 2)}%`,
                    opacity: b.totals.messages > 0 ? 1 : 0.25,
                  }}
                />
              </div>
              <span className="text-2xs text-ink-mute mt-1 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
                {b.totals.messages > 0 ? b.label : b.label.split(' ')[0]}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
