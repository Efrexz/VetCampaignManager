/**
 * Expanded row for one campaign in History: messages-sent breakdown by
 * category (chip per category), plus metadata. All counts are computed in
 * the browser from the stored payload — no extra Supabase queries, rows or
 * storage.
 */
import { AlertCircle, FlaskConical, FolderOpen } from 'lucide-react'
import { Td, Tr } from '@/shared/components/ui'
import { sentByCategory } from '@/lib/stats'
import type { CampaignRecord } from '@/lib/types'

const CATEGORY_CHIP_TONES: string[] = [
  'bg-vegetal-soft text-vegetal',
  'bg-clay-soft text-clay',
  'bg-mist-soft text-ink-soft',
]

export function CampaignDetailRow({ record, columns }: {
  record: CampaignRecord
  columns: number
}) {
  const byCategory = sentByCategory(record)
  const failed = record.status !== 'sent'
  return (
    <Tr className="bg-mist-soft/30">
      <Td colSpan={columns} className="px-5 py-3">
        <div className="space-y-2 text-xs">
          <p className="text-ink-mute flex items-center gap-1.5">
            <FolderOpen size={12} />
            <span className="truncate">
              Archivo: <span className="text-ink-soft">{record.sourceFile || 'desconocido'}</span>
            </span>
          </p>

          {failed ? (
            <p className="text-danger flex items-center gap-1.5">
              <AlertCircle size={12} />
              Envío fallido: nada salió.{' '}
              {record.errorMessage && (
                <span className="truncate">({record.errorMessage})</span>
              )}
            </p>
          ) : (
            <>
              {record.mock && (
                <p className="text-warn flex items-center gap-1.5">
                  <FlaskConical size={12} />
                  Envío de prueba (demo): no salió nada de verdad.
                </p>
              )}
              <div className="flex items-start gap-2 flex-wrap" role="list">
                <span className="text-ink-mute leading-6">
                  Mensajes por categoría:
                </span>
                {byCategory.length === 0 ? (
                  <span className="text-ink-mute">sin detalle en el registro</span>
                ) : (
                  byCategory.map((c, i) => (
                    <span
                      key={c.category}
                      className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 tnum ${
                        CATEGORY_CHIP_TONES[i % CATEGORY_CHIP_TONES.length]
                      }`}
                      title={`${c.count} mensaje(s) de ${c.category}`}
                    >
                      {c.category}
                      <span className="font-semibold">{c.count}</span>
                    </span>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </Td>
    </Tr>
  )
}
