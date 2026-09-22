import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  FlaskConical,
} from 'lucide-react'
import {
  Card,
  StatusPill,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/shared/components/ui'
import { listCampaigns, type CampaignRecord } from '@/storage/exports'
import { useTenantStore } from '@/shared/stores/tenantStore'
import { HAS_SUPABASE } from '@/integrations/supabase'
import { filterByBranchScope } from '@/lib/branchScope'
import { CampaignDetailRow } from './CampaignDetailRow'

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function History() {
  const [records, setRecords] = useState<CampaignRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    listCampaigns(50)
      .then(setRecords)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error al cargar el historial.')
      })
  }, [])

  // Presentation-level scoping: branch-bound members (receptionists) see only
  // their sede's campaigns; owners/admins see the whole clinic. Security
  // stays at the RLS tenant boundary — this is a UI decision, not a wall.
  // Matching prefers the stable `branch_id` (rename-proof); the label match
  // only serves legacy records saved before ids were stored.
  const { myBranchId, myBranchName } = useMemo(() => {
    if (!HAS_SUPABASE) return { myBranchId: null as number | null, myBranchName: null as string | null }
    const { tenants, currentTenantId, branches } = useTenantStore.getState()
    const branchId =
      tenants.find((t) => t.id === currentTenantId)?.branchId ?? null
    return {
      myBranchId: branchId,
      myBranchName:
        branchId == null ? null : branches.find((b) => b.id === branchId)?.name ?? null,
    }
  }, [])

  const visible = useMemo(
    () =>
      records === null
        ? null
        : filterByBranchScope(records, myBranchId, myBranchName),
    [records, myBranchId, myBranchName],
  )

  if (records === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-soft">
        <Loader2 className="animate-spin" size={14} />
        Cargando historial…
      </div>
    )
  }

  const shown = visible ?? []

  if (error) {
    return (
      <Card className="p-4 border-danger/30 bg-danger-soft/30 text-danger text-sm">
        No se pudo cargar el historial. Revisa tu conexión e intenta de nuevo.
        <span className="block mt-1 text-xs opacity-70">{error}</span>
      </Card>
    )
  }

  if (shown.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="p-6 text-center">
          <p className="text-sm text-ink-soft">
            {myBranchName
              ? `Tu sede (${myBranchName}) aún no ha enviado ninguna campaña. Cuando envíe una, aparecerá aquí con el detalle de destinatarios y resultado.`
              : 'Aún no has enviado ninguna campaña. Cuando envíes una, aparecerá aquí con el detalle de destinatarios y resultado.'}
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-rise">
      {/* Scope summary chips — the TopBar header already frames the page */}
      <SummaryChips records={shown} branchName={myBranchName} />
      <Card className="overflow-hidden">
        <Table>
          <Thead className="bg-mist-soft/40">
            <tr>
              <Th className="w-40">Fecha</Th>
              <Th className="w-32 max-w-36">Sede</Th>
              <Th className="w-36 min-w-28">Estado</Th>
              <Th className="text-right">Enviados</Th>
              <Th className="text-right">Inválidos</Th>
              <Th className="text-right">Duplicados</Th>
              <Th className="text-right">Excluidos</Th>
            </tr>
          </Thead>
          <Tbody>
            {shown.map((r) => {
              const expanded = expandedId === r.id
              return (
                <Fragment key={r.id}>
                  <Tr
                    onClick={() => setExpandedId(expanded ? null : r.id)}
                    className={`cursor-pointer transition-colors ${
                      expanded ? 'bg-mist-soft/50' : 'hover:bg-mist-soft/30'
                    }`}
                    title={expanded ? 'Cerrar detalle' : 'Ver detalle de esta campaña'}
                  >
              <Td className="text-ink-soft flex items-center gap-1 whitespace-nowrap text-sm">
                {expanded ? (
                  <ChevronDown size={12} className="text-ink-mute shrink-0" />
                ) : (
                  <ChevronRight size={12} className="text-ink-mute shrink-0 opacity-0 group-hover/tr:opacity-100 transition-opacity" />
                )}
                {fmtDate(r.createdAt)}
              </Td>
              <Td className="text-ink-soft truncate max-w-36">{r.branch?.trim() || '—'}</Td>
                    <Td>
                      {r.mock && (
                        <span
                          className="inline-flex items-center gap-0.5 text-2xs text-warn mr-2"
                          title="Envío de prueba: no salió nada de verdad."
                        >
                          <FlaskConical size={10} />
                          Demo
                        </span>
                      )}
                      {r.status === 'sent' ? (
                        <StatusPill tone="sent" label="Enviada" />
                      ) : (
                        <StatusPill
                          tone="failed"
                          label="Falló"
                          title={r.errorMessage ?? undefined}
                        />
                      )}
                    </Td>
                    <Td className="text-right font-mono tnum text-ink">{r.enabledRecipients}</Td>
                    <Td className="text-right font-mono tnum text-ink-soft">{r.invalidRecipients}</Td>
                    <Td className="text-right font-mono tnum text-ink-soft">{r.duplicateRecipients}</Td>
                    <Td className="text-right font-mono tnum text-ink-soft">{r.excludedRecipients ?? 0}</Td>
                  </Tr>
                  {expanded && (
                    <CampaignDetailRow record={r} columns={7} />
                  )}
                </Fragment>
              )
            })}
          </Tbody>
        </Table>
      </Card>
      <p className="text-2xs text-ink-mute">
        Los envíos marcados como "Demo" son pruebas: no enviaron mensajes de
        verdad y el panel de resumen no los cuenta.
      </p>
    </div>
  )
}

/** Quiet chips summarizing the loaded history (scope-wide). */
function SummaryChips({
  records,
  branchName,
}: {
  records: CampaignRecord[]
  branchName: string | null
}) {
  const real = records.filter((r) => !r.mock)
  const messages = real.reduce(
    (n, r) => n + (r.status === 'sent' ? r.enabledRecipients : 0),
    0,
  )
  const dates = real
    .map((r) => new Date(r.createdAt).getTime())
    .filter((t) => !Number.isNaN(t))
  const period =
    dates.length === 0
      ? 'sin envíos'
      : dates.length === 1
        ? '1 día'
        : `${new Date(Math.min(...dates)).toLocaleDateString('es-PE', { month: 'short', day: 'numeric' }).replace('.', '')} – ${new Date(Math.max(...dates)).toLocaleDateString('es-PE', { month: 'short', day: 'numeric' }).replace('.', '')}`

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-mist bg-mist-soft px-2.5 py-1 text-2xs text-ink-soft tnum">
        <span className="font-mono font-semibold text-ink">
          {real.length.toLocaleString('es-PE')}
        </span>
        campaña(s)
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-mist bg-mist-soft px-2.5 py-1 text-2xs text-ink-soft tnum">
        <span className="font-mono font-semibold text-ink">
          {messages.toLocaleString('es-PE')}
        </span>
        mensajes
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-mist bg-mist-soft px-2.5 py-1 text-2xs text-ink-soft tnum">
        {period}
      </span>
      {branchName && (
        <span className="text-2xs text-ink-mute">· {branchName}</span>
      )}
    </div>
  )
}
