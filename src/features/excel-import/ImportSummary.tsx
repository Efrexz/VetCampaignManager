/**
 * Post-import summary (mockup-style): file hero with an import-OK banner,
 * four honest KPI cards, detected categories with the grouping note, the
 * problems list, and the continue footer. Pure presentation on top of the
 * parsed result — no store changes.
 */
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, FileSpreadsheet, RotateCcw, Tag, Users, Check, X, Copy, Info } from 'lucide-react'
import { Button, Card, KpiCard } from '@/shared/components/ui'
import { ImportErrorList } from './ImportErrorList'
import { useCampaignStore } from '@/shared/stores/campaignStore'
import type { ImportResult } from '@/lib/types'

interface Props {
  result: ImportResult
  fileName: string
  onReset: () => void
}

export function ImportSummary({ result, fileName, onReset }: Props) {
  const navigate = useNavigate()
  const setPhase = useCampaignStore((s) => s.setPhase)

  const canContinue = result.totals.valid > 0
  const fileExt = fileName.toLowerCase().endsWith('.xls') ? '.xls' : '.xlsx'

  const handleContinue = () => {
    setPhase('preview')
    navigate('/campaign/preview')
  }

  return (
    <div className="space-y-5">
      {/* Hero: file identity + import-OK banner */}
      <Card className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="rounded-md bg-vegetal-soft text-vegetal p-2.5 shrink-0">
              <FileSpreadsheet size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate">{fileName}</p>
              <p className="text-2xs text-ink-mute tnum mt-0.5">
                {result.totals.totalRows} fila
                {result.totals.totalRows === 1 ? '' : 's'} · {fileExt}
              </p>
              {result.detectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {result.detectedCategories.slice(0, 6).map((c) => (
                    <span
                      key={c.name}
                      className="inline-flex items-center gap-1 rounded-sm bg-vegetal-soft text-vegetal px-2 py-0.5 text-2xs"
                      title={`${c.count} fila(s) con esta categoría`}
                    >
                      <Tag size={10} />
                      <span className="font-medium">{c.name}</span>
                      <span className="tnum opacity-70">{c.count}</span>
                    </span>
                  ))}
                  {result.detectedCategories.length > 6 && (
                    <span className="text-2xs text-ink-mute self-center">
                      +{result.detectedCategories.length - 6} más
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="hidden lg:block flex-1" />

          <div className="rounded-md bg-vegetal-soft/60 border border-vegetal/15 p-3 flex items-start gap-2.5 lg:max-w-72">
            <span className="rounded-sm bg-paper text-vegetal p-1.5 shrink-0">
              <CheckCircle2 size={16} />
            </span>
            <div className="text-xs leading-relaxed">
              <p className="font-semibold text-ink flex items-center gap-1.5">
                Archivo importado correctamente
              </p>
              <p className="text-2xs text-ink-soft mt-0.5">
                Revisa los destinatarios y continúa con tu campaña.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<Users size={14} />}
          label="Total"
          value={result.totals.totalRows.toLocaleString('es-PE')}
          foot="contactos en el archivo"
          tone="neutral"
        />
        <KpiCard
          icon={<Check size={14} />}
          label="Válidos"
          value={result.totals.valid.toLocaleString('es-PE')}
          foot="listos para enviar"
          tone="vegetal"
        />
        <KpiCard
          icon={<X size={14} />}
          label="Inválidos"
          value={result.totals.invalid.toLocaleString('es-PE')}
          foot={result.totals.invalid > 0 ? 'con teléfono o fila en error' : 'sin errores'}
          tone={result.totals.invalid > 0 ? 'danger' : 'neutral'}
        />
        <KpiCard
          icon={<Copy size={14} />}
          label="Duplicados"
          value={result.totals.duplicate.toLocaleString('es-PE')}
          foot={result.totals.duplicate > 0 ? 'registros repetidos' : 'sin repetidos'}
          tone={result.totals.duplicate > 0 ? 'warn' : 'neutral'}
        />
      </div>

      {/* Grouping note (the "why fewer messages than rows" explainer) */}
      <Card className="p-4 flex flex-col sm:flex-row items-start gap-4">
        <div className="flex items-start gap-2.5 sm:w-56 shrink-0">
          <span className="rounded-sm bg-vegetal-soft text-vegetal p-1.5">
            <CheckCircle2 size={14} />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">Antes de continuar</p>
            <p className="text-2xs text-ink-mute mt-0.5 leading-relaxed">
              {result.detectedCategories.length > 0
                ? `${result.detectedCategories.length} categoría(s) detectada(s) en el archivo.`
                : 'No se detectaron categorías: usarán la plantilla Predeterminada.'}
            </p>
          </div>
        </div>
        <div className="sm:border-l sm:border-mist pl-0 sm:pl-4 flex items-start gap-2.5">
          <Info size={14} className="text-ink-mute shrink-0 mt-0.5" />
          <p className="text-xs text-ink-soft leading-relaxed">
            Si un cliente tiene varias mascotas o servicios repetidos, se
            agrupan en un solo mensaje por servicio — sin mensajes duplicados.
            Lo revisas en detalle en el siguiente paso.
          </p>
        </div>
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

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw size={14} />
          Importar otro
        </Button>
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
