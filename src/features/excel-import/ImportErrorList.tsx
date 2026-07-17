import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Chip } from '@/shared/components/ui'
import type { ImportResult } from '@/lib/types'

interface Props {
  result: ImportResult
}

/** Collapsible, row-specific listing of invalid and duplicate recipients. */
export function ImportErrorList({ result }: Props) {
  const [open, setOpen] = useState(false)

  const problematic = result.recipients.filter(
    (r) => r.phoneStatus !== 'valid',
  )
  if (problematic.length === 0) return null
  const invalidCount = problematic.filter((r) => r.phoneStatus === 'invalid').length
  const dupCount = problematic.length - invalidCount

  return (
    <div className="rounded-md border border-mist bg-paper overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-mist-soft/40 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <AlertTriangle size={14} className="text-warn" />
          {problematic.length} fila{problematic.length === 1 ? '' : 's'} con problemas
          <span className="flex items-center gap-1">
            {invalidCount > 0 && (
              <Chip tone="danger" className="ml-1">
                {invalidCount} inválido{invalidCount === 1 ? '' : 's'}
              </Chip>
            )}
            {dupCount > 0 && (
              <Chip tone="warn" className="ml-1">
                {dupCount} duplicado{dupCount === 1 ? '' : 's'}
              </Chip>
            )}
          </span>
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="border-t border-mist overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-mist-soft/40">
              <tr className="text-left text-2xs uppercase tracking-wide text-ink-mute">
                <th className="px-3 py-2 font-semibold w-16">Fila</th>
                <th className="px-3 py-2 font-semibold">Propietario</th>
                <th className="px-3 py-2 font-semibold">Mascota</th>
                <th className="px-3 py-2 font-semibold">Teléfono</th>
                <th className="px-3 py-2 font-semibold">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {problematic.map((r) => (
                <tr
                  key={r.id}
                  className={cn(
                    'border-t border-mist',
                    r.phoneStatus === 'invalid' && 'bg-danger-soft/30',
                  )}
                >
                  <td className="px-3 py-2 text-ink-mute">{r.rowNumber}</td>
                  <td className="px-3 py-2">{r.owner || '—'}</td>
                  <td className="px-3 py-2">{r.pet || '—'}</td>
                  <td className="px-3 py-2 text-ink-mute" style={{ fontFamily: 'var(--font-mono)' }}>
                    {r.rawPhone || '—'}
                  </td>
                  <td className="px-3 py-2 text-ink-soft">{r.issue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}