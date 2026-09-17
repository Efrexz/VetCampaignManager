/**
 * Horizontal month rows (plain CSS): one row per month, click to zoom the
 * dashboard into that month. The selected month is highlighted; other rows
 * get hover affordance so they read as tappable.
 */
import { ChevronRight } from 'lucide-react'
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
  const maxMessages = Math.max(1, ...months.map((m) => m.totals.messages))
  return (
    <Card className="p-5">
      <p className="text-sm text-ink-soft mb-1">{title}</p>
      <p className="text-2xs text-ink-mute mb-4">
        Haz clic en un mes para ver su detalle día a día.
      </p>
      <div className="space-y-1">
        {months.map((m) => {
          const active = m.key === selectedKey
          const empty = m.totals.messages === 0
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onSelect(m.key)}
              disabled={empty}
              title={
                empty
                  ? `${m.label} · sin campañas`
                  : `Ver ${m.label} en detalle`
              }
              className={`group w-full flex items-center gap-3 rounded-sm px-2 py-1.5 text-left transition-colors ${
                active
                  ? 'bg-vegetal-soft/60'
                  : empty
                    ? 'cursor-default'
                    : 'hover:bg-mist-soft/50 cursor-pointer'
              }`}
            >
              <span
                className={`text-xs w-24 shrink-0 ${
                  active ? 'text-vegetal font-semibold' : 'text-ink-soft'
                }`}
              >
                {m.label}
              </span>
              <div className="flex-1 h-5 rounded-sm bg-mist-soft/60 overflow-hidden">
                <div
                  className={`h-full rounded-sm ${
                    active ? 'bg-vegetal' : 'bg-vegetal/60 group-hover:bg-vegetal/75'
                  }`}
                  style={{ width: `${(m.totals.messages / maxMessages) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono tnum text-ink w-24 text-right shrink-0">
                {fmt(m.totals.messages)} msj
              </span>
              <span className="text-2xs text-ink-mute w-16 text-right shrink-0 tnum">
                {m.totals.campaigns} camp.
              </span>
              <ChevronRight
                size={14}
                className={`shrink-0 ${
                  empty
                    ? 'text-mist'
                    : active
                      ? 'text-vegetal'
                      : 'text-ink-mute group-hover:text-vegetal'
                }`}
              />
            </button>
          )
        })}
      </div>
    </Card>
  )
}
