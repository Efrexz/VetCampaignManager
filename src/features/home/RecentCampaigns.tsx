/**
 * Compact "Últimas campañas" table: the 5 most recent dispatches in scope,
 * with a link into the full History page.
 */
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ChevronRight,
  FlaskConical,
  ListChecks,
} from 'lucide-react'
import { Card, StatusPill, Table, Tbody, Td, Th, Thead, Tr } from '@/shared/components/ui'
import { relativeTimeEs } from '@/lib/format'
import type { CampaignRecord } from '@/lib/types'

export function RecentCampaigns({ records, showBranch = false }: {
  records: CampaignRecord[]
  showBranch?: boolean
}) {
  const navigate = useNavigate()
  const recent = records.slice(0, 5)

  if (recent.length === 0) return null

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-5 pb-3">
        <p className="text-sm text-ink-soft flex items-center gap-2">
          <ListChecks size={14} className="text-vegetal" />
          Últimas campañas
        </p>
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="inline-flex items-center gap-1 text-xs font-medium text-vegetal hover:text-vegetal-strong transition-colors"
        >
          Ver historial
          <ArrowRight size={12} />
        </button>
      </div>
      <Table>
        <Thead className="bg-mist-soft/60">
          <tr>
            <Th className="w-40">Fecha</Th>
            {showBranch && <Th className="w-32">Sede</Th>}
            <Th className="w-36 min-w-28">Estado</Th>
            <Th className="text-right w-28">Enviados</Th>
            <Th className="text-right w-28">Excluidos</Th>
            <th aria-hidden="true" />
          </tr>
        </Thead>
        <Tbody>
          {recent.map((r) => (
            <Tr
              key={r.id}
              onClick={() => navigate('/history')}
              className="cursor-pointer hover:bg-mist-soft/40 transition-colors"
              title="Ver detalle en el historial"
            >
              <Td className="text-ink-soft whitespace-nowrap text-sm">
                {relativeTimeEs(r.createdAt) || '—'}
              </Td>
              {showBranch && (
                <Td className="text-ink-soft truncate max-w-32 text-sm">
                  {r.branch?.trim() || '—'}
                </Td>
              )}
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
              <Td className="text-right font-mono tnum font-medium text-ink">
                {r.enabledRecipients.toLocaleString('es-PE')}
              </Td>
              <Td className="text-right font-mono tnum text-ink-soft">
                {r.excludedRecipients ?? 0}
              </Td>
              <Td className="w-6 text-right">
                <ChevronRight
                  size={14}
                  className="text-ink-mute opacity-0 group-hover/tr:opacity-100 transition-opacity"
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Card>
  )
}
