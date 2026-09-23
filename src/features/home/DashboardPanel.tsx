/**
 * Dashboard panel: aggregates the campaign history (localStorage or Supabase
 * via the storage seam). Views: last 14 days (default), current month, and
 * the last 6 months with click-to-zoom into any month. Data math lives in
 * `lib/stats.ts`; this component only loads records and renders.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3, Building2, CopyX, Inbox, Send, ShieldCheck, UserRoundX } from 'lucide-react'
import {
  Card,
  EmptyState,
  KpiCard,
  Segmented,
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/shared/components/ui'
import { listCampaigns } from '@/storage/exports'
import type { CampaignRecord } from '@/lib/types'
import { useTenantStore } from '@/shared/stores/tenantStore'
import { useSettingsStore } from '@/shared/stores/settingsStore'
import { HAS_SUPABASE } from '@/integrations/supabase'
import { filterByBranchScope } from '@/lib/branchScope'
import {
  aggregateCampaigns,
  elapsedMonthDays,
  filterByLastDays,
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
import { RecentCampaigns } from './RecentCampaigns'

/** View ids shown to the user ('day' exists in stats but is not offered). */
type RangeView = 'fourteen' | 'month' | 'six'

const RANGE_OPTIONS: { id: string; label: string }[] = [
  { id: 'fourteen', label: '14 días' },
  { id: 'month', label: 'Mes' },
  { id: 'six', label: 'Últimos 6 meses' },
]

const RANGE_CAPTION: Record<RangeView, string> = {
  fourteen: 'Últimos 14 días',
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
  const [range, setRange] = useState<RangeView>('fourteen')
  /** Zoomed-in month ('YYYY-MM') inside the 6-month view, or null. */
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  /** Owner-only stats scope: null = all sedes (default), number = one sede. */
  const [scopeBranchId, setScopeBranchId] = useState<number | null>(null)
  const webhookUrl = useSettingsStore((s) => s.settings.webhookUrl)

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
    if (view === 'fourteen') return filterByLastDays(scoped, 14)
    if (view === 'month') return filterByRange(scoped, 'month')
    if (view === 'six') return filterByLastMonths(scoped, 6)
    return filterByMonth(scoped, selectedMonth!)
  }, [scoped, view, selectedMonth])

  const monthRows = useMemo(
    () => (view === 'six' ? groupByMonth(scoped, 6) : null),
    [view, scoped],
  )

  const dayBuckets = useMemo(() => {
    if (view === 'fourteen') return groupByDay(scoped, 14)
    if (view === 'month') return groupByDay(windowRecords, elapsedMonthDays())
    if (view === 'month-detail') return groupByDayInMonth(scoped, selectedMonth!)
    return null
  }, [view, windowRecords, scoped, selectedMonth])

  const totals = useMemo(() => aggregateCampaigns(windowRecords), [windowRecords])
  const guarded = totals.invalid + totals.duplicate + totals.excluded
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
          <button
            type="button"
            onClick={() => navigate('/campaign')}
            className="inline-flex items-center gap-1.5 rounded-md bg-vegetal px-4 py-2 text-sm font-medium text-paper hover:bg-vegetal-strong transition-colors"
          >
            <Send size={14} />
            Nueva campaña
          </button>
        }
      />
    )
  }

  const branchNameSuffix = scopedBranchName ? ` · ${scopedBranchName}` : ''
  const headline =
    (view === 'month-detail'
      ? monthLabel(selectedMonth!)
      : RANGE_CAPTION[view]) + branchNameSuffix
  const demoMode = !HAS_SUPABASE && !webhookUrl.trim()

  return (
    <div className="space-y-4">
      {demoMode && (
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="w-full flex items-center gap-2 rounded-md border border-warn/40 bg-warn-soft/40 px-4 py-2.5 text-xs text-ink-soft hover:bg-warn-soft/70 transition-colors text-left"
        >
          <Inbox size={14} className="text-warn shrink-0" />
          <span>
            Estás en <strong className="text-warn">modo demo</strong>: los envíos
            no salen de verdad. <span className="text-warn underline">Configura tu webhook en Ajustes</span> para enviar mensajes reales.
          </span>
        </button>
      )}

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

      {/* KPI: scope headline numbers, one card each */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={<Send size={14} />}
          label="Campañas"
          value={fmt(totals.campaigns)}
          foot={`enviadas · ${headline.toLowerCase()}`}
        />
        <KpiCard
          icon={<Inbox size={14} />}
          label="Mensajes"
          value={fmt(totals.messages)}
          foot="salieron por WhatsApp"
        />
        <KpiCard
          icon={<ShieldCheck size={14} />}
          label="Protegidos"
          value={fmt(guarded)}
          foot="filtrados antes de enviar"
          tone="neutral"
        />
      </div>

      {/* Import-quality chip row for the selected range */}
      {guarded > 0 && (
        <div className="flex flex-wrap gap-2">
          <FilterChip icon={<UserRoundX size={11} />} value={totals.invalid} label="inválido" />
          <FilterChip icon={<CopyX size={11} />} value={totals.duplicate} label="duplicado" />
          <FilterChip icon={<ShieldCheck size={11} />} value={totals.excluded} label="excluido" />
        </div>
      )}

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
            view === 'fourteen'
              ? 'Mensajes por día · últimos 14 días'
              : view === 'month'
                ? 'Mensajes por día · este mes'
                : `Mensajes por día · ${monthLabel(selectedMonth!)}`
          }
          buckets={dayBuckets}
        />
      ) : null}

      {/* Recent dispatches, independent of the selected range */}
      <RecentCampaigns records={lastFirst(scoped)} showBranch={scopedBranchId === null && branches.length > 1} />

      {/* Branch breakdown — only for the whole-clinic view; a single-sede
          scope makes the comparison table redundant */}
      {scopedBranchId === null && branches.length > 0 && (
        <Card className="overflow-hidden">
          <p className="text-sm text-ink-soft p-5 pb-3 flex items-center gap-2">
            <Building2 size={14} className="text-vegetal" />
            Por sede <span className="text-ink-mute">· {headline.toLowerCase()}</span>
          </p>
          <Table>
            <Thead className="bg-mist-soft/60">
              <tr>
                <Th>Sede</Th>
                <Th className="text-right">Campañas</Th>
                <Th className="w-56">Mensajes</Th>
                <Th className="text-right">Excluidos</Th>
              </tr>
            </Thead>
            <Tbody>
              {branches.map((b) => {
                const maxMessages = Math.max(...branches.map((x) => x.totals.messages), 1)
                const pct = Math.round((b.totals.messages / maxMessages) * 100)
                return (
                  <Tr
                    key={b.branch}
                    onClick={() => navigate('/history')}
                    className="cursor-pointer hover:bg-mist-soft/40 transition-colors"
                    title="Ver envíos de esta sede en el historial"
                  >
                    <Td className="text-ink text-sm font-medium">{b.branch}</Td>
                    <Td className="text-right font-mono tnum text-ink-soft">
                      {b.totals.campaigns}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono tnum text-ink w-10 text-right">
                          {fmt(b.totals.messages)}
                        </span>
                        <div className="h-1.5 flex-1 rounded-sm bg-mist-soft overflow-hidden">
                          <div
                            className="h-full rounded-sm bg-vegetal/70 min-w-1"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </Td>
                    <Td className="text-right font-mono tnum text-ink-soft">
                      {b.totals.excluded}
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        </Card>
      )}
    </div>
  )
}

/** Most recent first, newest at the top. */
function lastFirst(records: CampaignRecord[]): CampaignRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

/** Small import-quality chip with an icon and count. */
function FilterChip({
  icon,
  value,
  label,
}: {
  icon: ReactNode
  value: number
  label: string
}) {
  if (value <= 0) return null
  const plural = label === 'invalid' ? 'inválido(s)' : `${label}(s)`
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-mist bg-mist-soft px-2 py-1 text-2xs text-ink-soft tnum">
      <span className="text-vegetal">{icon}</span>
      <span className="font-mono font-semibold text-ink">{fmt(value)}</span>
      {plural}
    </span>
  )
}
