import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  History as HistoryIcon,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  FlaskConical,
} from 'lucide-react'
import { Card, Table, Tbody, Td, Th, Thead, Tr } from '@/shared/components/ui'
import { listCampaigns, type CampaignRecord } from '@/storage/exports'
import { useTenantStore } from '@/shared/stores/tenantStore'
import { HAS_SUPABASE } from '@/integrations/supabase'
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
    const branchId = tenants.find((t) => t.id === currentTenantId)?.branchId
    return {
      myBranchId: branchId,
      myBranchName:
        branchId == null ? null : branches.find((b) => b.id === branchId)?.name ?? null,
    }
  }, [])

  const visible = useMemo(() => {
    if (records === null || (myBranchId === null && myBranchName === null)) {
      return records
    }
    const matches = (r: CampaignRecord): boolean => {
      if (r.branchId != null) return r.branchId === myBranchId
      if (myBranchId != null) return (r.branch ?? '') === myBranchName
      return (r.branch ?? '') === myBranchName
    }
    return records.filter(matches)
  }, [records, myBranchId, myBranchName])

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
        <div className="flex items-center gap-2">
          <HistoryIcon className="text-ink-soft" size={18} />
          <h2 className="text-md font-semibold text-ink">Historial de campañas</h2>
        </div>
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
      <div className="flex items-center gap-2">
        <HistoryIcon className="text-ink-soft" size={18} />
        <h2 className="text-md font-semibold text-ink">
          {myBranchName ? `Historial — ${myBranchName}` : 'Historial de campañas'}
        </h2>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <Thead className="bg-mist-soft/40">
            <tr>
              <Th>Fecha</Th>
              <Th>Sede</Th>
              <Th>Estado</Th>
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
                    <Td className="text-ink-soft flex items-center gap-1">
                      {expanded ? (
                        <ChevronDown size={12} className="text-ink-mute" />
                      ) : (
                        <ChevronRight size={12} className="text-ink-mute" />
                      )}
                      {fmtDate(r.createdAt)}
                    </Td>
                    <Td className="text-ink-soft">{r.branch?.trim() || '—'}</Td>
                    <Td>
                      {r.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 text-vegetal">
                          <CheckCircle2 size={12} />
                          <span className="text-xs">Enviado</span>
                          {r.mock && (
                            <span
                              className="inline-flex items-center gap-0.5 text-2xs text-warn"
                              title="Envío de prueba: no salió nada de verdad."
                            >
                              <FlaskConical size={10} />
                              Demo
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-danger" title={r.errorMessage ?? ''}>
                          <AlertCircle size={12} />
                          <span className="text-xs">Falló</span>
                        </span>
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
