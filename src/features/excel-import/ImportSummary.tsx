import { useNavigate } from 'react-router-dom'
import { ArrowRight, RotateCcw, Users, Check, X, Copy, Tag } from 'lucide-react'
import { Button, Card } from '@/shared/components/ui'
import { ImportErrorList } from './ImportErrorList'
import { useCampaignStore } from '@/shared/stores/campaignStore'
import type { ImportResult } from '@/lib/types'

interface Props {
  result: ImportResult
  fileName: string
  onReset: () => void
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: 'neutral' | 'vegetal' | 'danger' | 'warn'
}) {
  const toneRing = {
    neutral: 'bg-mist-soft text-ink-soft',
    vegetal: 'bg-vegetal-soft text-vegetal',
    danger: 'bg-danger-soft text-danger',
    warn: 'bg-warn-soft text-warn',
  }[tone]

  return (
    <div className="rounded-md bg-paper border border-mist p-4 flex flex-col gap-1">
      <span className="flex items-center gap-2 text-2xs uppercase tracking-wide text-ink-mute">
        <span className={`rounded-sm p-1 ${toneRing}`}>{icon}</span>
        {label}
      </span>
      <span className="text-2xl font-semibold tnum leading-none">{value}</span>
    </div>
  )
}

export function ImportSummary({ result, fileName, onReset }: Props) {
  const navigate = useNavigate()
  const setPhase = useCampaignStore((s) => s.setPhase)

  const canContinue = result.totals.valid > 0

  const handleContinue = () => {
    setPhase('preview')
    navigate('/campaign/preview')
  }

  return (
    <div className="space-y-5">
      {/* File line + reset */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-ink-soft min-w-0">
          <span className="truncate font-medium text-ink">{fileName}</span>
          <span className="text-ink-mute">·</span>
          <span className="shrink-0 text-ink-mute">
            {result.totals.totalRows} fila{result.totals.totalRows === 1 ? '' : 's'}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw size={14} />
          Importar otro
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Users size={14} />}
          label="Total"
          value={result.totals.totalRows}
          tone="neutral"
        />
        <StatCard
          icon={<Check size={14} />}
          label="Válidos"
          value={result.totals.valid}
          tone="vegetal"
        />
        <StatCard
          icon={<X size={14} />}
          label="Inválidos"
          value={result.totals.invalid}
          tone="danger"
        />
        <StatCard
          icon={<Copy size={14} />}
          label="Duplicados"
          value={result.totals.duplicate}
          tone="warn"
        />
      </div>

      {/* Detected categories */}
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-ink mb-3">
          <Tag size={14} className="text-vegetal" />
          Categorías detectadas
          <span className="text-ink-mute font-normal">
            ({result.detectedCategories.length})
          </span>
        </div>
        {result.detectedCategories.length === 0 ? (
          <p className="text-sm text-ink-mute">
            No se detectaron categorías en el archivo.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {result.detectedCategories.map((c) => (
              <span
                key={c.name}
                className="inline-flex items-center gap-1.5 rounded-md bg-mist-soft px-2.5 py-1 text-xs border border-mist"
              >
                <span className="font-medium text-ink">{c.name}</span>
                <span className="text-ink-mute tnum">{c.count}</span>
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Problems list (collapsible) */}
      <ImportErrorList result={result} />

      {/* Continue notice */}
      {!canContinue && (
        <div className="rounded-md border border-danger/30 bg-danger-soft/40 p-3 text-sm text-danger">
          No hay destinatarios válidos. Corrige el archivo en VetPraxis e
          impórtalo de nuevo antes de continuar.
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-ink-mute">
          Los duplicados se excluyen por defecto del envío. Puedes revisarlos
          en el siguiente paso.
        </p>
        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          disabled={!canContinue}
        >
          Continuar
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  )
}