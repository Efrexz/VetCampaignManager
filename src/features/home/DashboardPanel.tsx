/**
 * Dashboard panel: aggregates the campaign history (localStorage or Supabase
 * via the storage seam). Views: last 7 days, current month, and the last
 * 6 months with click-to-zoom into any month. Data math lives in
 * `lib/stats.ts`; this component only loads records and renders.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3, Building2, CheckCircle2, CopyX, Send, ShieldCheck, UserRoundX, Users } from 'lucide-react'
import {
  Card,
  EmptyState,
  Segmented,
  Select,
  Spinner,
  Stat,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/shared/components/ui'
import { Button } from '@/shared/components/ui'
import { listCampaigns } from '@/storage/exports'
import type { CampaignRecord } from '@/lib/types'
import { useTenantStore } from '@/shared/stores/tenantStore'
import { HAS_SUPABASE } from '@/integrations/supabase'
import { filterByBranchScope } from '@/lib/branchScope'
import {
  aggregateCampaigns,
  elapsedMonthDays,
  filterByLastMonths,
  filterByMonth,
  filterByRange,
  groupByBranch,
  groupByDay,
  groupByDayInMonth,
  groupByMonth,
  monthLabel,
} from '@/lib/stats'
import { DailyBarsCard } from './DailyBars'
import { MonthBarsCard } from './MonthBars'

/** View ids shown to the user ('day' exists in stats but is not offered). */
type RangeView = 'week' | 'month' | 'six'

const RANGE_OPTIONS: { id: string; label: string }[] = [
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'six', label: 'Últimos 6 meses' },
]

const RANGE_CAPTION: Record<RangeView, string> = {
  week: 'Últimos 7 días',
  month: 'Este mes',
  six: 'Últimos 6 meses',
}

function fmt(n: number): string {
  return n.toLocaleString('es-PE')
}

export function DashboardPanel() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<CampaignRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<RangeView>('month')
  /** Zoomed-in month ('YYYY-MM') inside the 6-month view, or null. */
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  /** Owner-only stats scope: null = all sedes (default), number = one sede. */
  const [scopeBranchId, setScopeBranchId] = useState<number | null>(null)

  const tenants = useTenantStore((s) => s.tenants)
  const currentTenantId = useTenantStore((s) => s.currentTenantId)
  const storeBranches = useTenantStore((s) => s.branches)

  // Sede scope resolution. Supabase mode: branch-bound members (receptionists)
  // are anchored to their sede; owner/admin pick a scope, defaulting to "all".
  // localStorage mode: single user, no scoping.
  const memberBranchId = HAS_SUPABASE
    ? tenants.find((t) => t.id === currentTenantId)?.branchId ?? null
    : null
  const scopedBranchId = memberBranchId ?? scopeBranchId
  const scopedBranchName =
    scopedBranchId != null
      ? storeBranches.find((b) => b.id === scopedBranchId)?.name ?? null
      : null
  const canPickScope = HAS_SUPABASE && memberBranchId === null && storeBranches.length > 0

  useEffect(() => {
    listCampaigns(400)
      .then(setRecords)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error al cargar el panel.')
      })
  }, [])

  const all: CampaignRecord[] = useMemo(() => records ?? [], [records])
  const scoped = useMemo(
    () => filterByBranchScope(all, scopedBranchId, scopedBranchName),
    [all, scopedBranchId, scopedBranchName],
  )
  const view = range === 'six' && selectedMonth ? 'month-detail' : range

  const windowRecords = useMemo(() => {
    if (view === 'week') return filterByRange(scoped, 'week')
    if (view === 'month') return filterByRange(scoped, 'month')
    if (view === 'six') return filterByLastMonths(scoped, 6)
    return filterByMonth(scoped, selectedMonth!)
  }, [scoped, view, selectedMonth])

  const monthRows = useMemo(
    () => (view === 'six' ? groupByMonth(scoped, 6) : null),
    [view, scoped],
  )

  const dayBuckets = useMemo(() => {
    if (view === 'week') return groupByDay(windowRecords, 7)
    if (view === 'month') return groupByDay(windowRecords, elapsedMonthDays())
    if (view === 'month-detail') return groupByDayInMonth(scoped, selectedMonth!)
    return null
  }, [view, windowRecords, scoped, selectedMonth])

  const totals = useMemo(() => aggregateCampaigns(windowRecords), [windowRecords])
  const branches = useMemo(() => groupByBranch(windowRecords), [windowRecords])
  const hasAnyReal = scoped.some((r) => !r.mock)

  if (records === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-soft">
        <Spinner />
        Cargando resumen…
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-4 border-danger/30 bg-danger-soft/30 text-danger text-sm">
        No se pudo cargar el resumen. Revisa tu conexión e intenta de nuevo.
        <span className="block mt-1 text-xs opacity-70">{error}</span>
      </Card>
    )
  }

  if (!hasAnyReal) {
    return (
      <EmptyState
        icon={<BarChart3 size={24} />}
        title="Aún no hay campañas registradas"
        description="Cuando envíes tu primera campaña, aquí verás cuántos mensajes salieron, cuántos contactos se excluyeron y cómo va día a día."
        action={
          <Button variant="primary" size="md" onClick={() => navigate('/campaign')}>
            Nueva campaña
          </Button>
        }
      />
    )
  }

  const branchNameSuffix = scopedBranchName ? ` · ${scopedBranchName}` : ''
  const headline =
    (view === 'month-detail'
      ? monthLabel(selectedMonth!)
      : RANGE_CAPTION[view]) + branchNameSuffix
  const showValueOnBars = (dayBuckets?.length ?? 0) <= 14

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-md font-semibold text-ink flex items-center gap-2">
          <BarChart3 size={16} className="text-vegetal" />
          Resumen de campañas
        </h2>
        <div className="flex items-center gap-2">
          {canPickScope && (
            <Select
              value={String(scopeBranchId ?? 'all')}
              onChange={(e) => {
                const v = e.target.value
                setScopeBranchId(v === 'all' ? null : Number(v))
              }}
              className="h-7 w-auto text-xs py-0"
              aria-label="Ámbito de las estadísticas"
              title="Clínica completa o una sola sede"
            >
              <option value="all">Todas las sedes</option>
              {storeBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
          <Segmented
            value={range}
            onChange={(id: string) => {
              setRange(id as RangeView)
              setSelectedMonth(null)
            }}
            options={RANGE_OPTIONS}
          />
        </div>
      </div>

      {/* Returning from a month zoom */}
      {view === 'month-detail' && (
        <button
          type="button"
          onClick={() => setSelectedMonth(null)}
          className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink transition-colors"
        >
          <ArrowLeft size={13} />
          <span className="tnum">Volver a {RANGE_CAPTION.six.toLowerCase()}</span>
        </button>
      )}

      {/* Selected scope headline numbers */}
      <Card className="p-5">
        <p className="text-sm text-ink-soft mb-3">{headline}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Stat size="sm" icon={<Send size={14} />} label="Campañas" value={totals.campaigns} tone="vegetal" mono />
          <Stat size="sm" icon={<Users size={14} />} label="Mensajes" value={fmt(totals.messages)} tone="vegetal" mono />
          <Stat size="sm" icon={<UserRoundX size={14} />} label="Inválidos" value={fmt(totals.invalid)} tone="neutral" mono />
          <Stat size="sm" icon={<CopyX size={14} />} label="Duplicados" value={fmt(totals.duplicate)} tone="neutral" mono />
          <Stat size="sm" icon={<CheckCircle2 size={14} />} label="Excluidos" value={fmt(totals.excluded)} tone="neutral" mono />
        </div>
      </Card>

      {/* Chart: month rows on the 6-month view, daily bars otherwise */}
      {view === 'six' && monthRows ? (
        <MonthBarsCard
          title="Mensajes por mes"
          months={monthRows}
          selectedKey={null}
          onSelect={setSelectedMonth}
        />
      ) : dayBuckets ? (
        <DailyBarsCard
          title={
            view === 'week'
              ? 'Mensajes por día · esta semana'
              : view === 'month'
                ? 'Mensajes por día · este mes'
                : `Mensajes por día · ${monthLabel(selectedMonth!)}`
          }
          buckets={dayBuckets}
          showValues={showValueOnBars}
        />
      ) : null}

      {/* Import-quality counters as a quiet protection line */}
      {(totals.invalid > 0 || totals.duplicate > 0 || totals.excluded > 0) && (
        <p className="text-xs text-ink-mute flex items-start gap-1.5 px-1">
          <ShieldCheck size={13} className="text-vegetal shrink-0 mt-0.5" />
          <span className="tnum">
            Filtrado automático ({headline.toLowerCase()}):{' '}
            {fmt(totals.invalid)} teléfono(s) inválido(s) · {fmt(totals.duplicate)}{' '}
            duplicado(s) · {fmt(totals.excluded)} excluido(s) por protección (no
            contactar / avisado hace poco).
          </span>
        </p>
      )}

      {/* Branch breakdown — only for the whole-clinic view; a single-sede
          scope makes the comparison table redundant */}
      {scopedBranchId === null && branches.length > 0 && (
        <Card className="overflow-hidden">
          <p className="text-sm text-ink-soft p-5 pb-3 flex items-center gap-2">
            <Building2 size={14} className="text-vegetal" />
            Por sede <span className="text-ink-mute">· {headline.toLowerCase()}</span>
          </p>
          <Table>
            <Thead className="bg-mist-soft/40">
              <tr>
                <Th>Sede</Th>
                <Th className="text-right">Campañas</Th>
                <Th className="text-right">Mensajes</Th>
                <Th className="text-right">Excluidos</Th>
              </tr>
            </Thead>
            <Tbody>
              {branches.map((b) => (
                <Tr key={b.branch}>
                  <Td className="text-ink">{b.branch}</Td>
                  <Td className="text-right font-mono tnum text-ink-soft">
                    {b.totals.campaigns}
                  </Td>
                  <Td className="text-right font-mono tnum text-ink">
                    {fmt(b.totals.messages)}
                  </Td>
                  <Td className="text-right font-mono tnum text-ink-soft">
                    {b.totals.excluded}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}
    </div>
  )
}
