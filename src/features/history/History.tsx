import { useEffect, useMemo, useState } from 'react'
import {
  History as HistoryIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FlaskConical,
} from 'lucide-react'
import { Card, Table, Tbody, Td, Th, Thead, Tr } from '@/shared/components/ui'
import { listCampaigns, type CampaignRecord } from '@/storage/exports'
import { useTenantStore } from '@/shared/stores/tenantStore'
import { HAS_SUPABASE } from '@/integrations/supabase'

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
  const myBranchName = useMemo(() => {
    if (!HAS_SUPABASE) return null
    const { tenants, currentTenantId, branches } = useTenantStore.getState()
    const branchId = tenants.find((t) => t.id === currentTenantId)?.branchId
    if (branchId == null) return null
    return branches.find((b) => b.id === branchId)?.name ?? null
  }, [])

  const visible = useMemo(() => {
    if (records === null || myBranchName === null) return records
    return records.filter((r) => (r.branch ?? '') === myBranchName)
  }, [records, myBranchName])

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
            {shown.map((r) => (
              <Tr key={r.id}>
                <Td className="text-ink-soft">{fmtDate(r.createdAt)}</Td>
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
            ))}
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
