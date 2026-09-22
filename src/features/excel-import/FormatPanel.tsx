/**
 * Side panel for the import screen: what the uploaded Excel must look like.
 * The centerpiece is a miniature replica of the VetPraxis report (headers +
 * two demo rows) so a non-technical receptionist recognizes the file shape
 * at a glance. No text beyond one line per tip.
 */
import { CheckCircle2, FileSpreadsheet } from 'lucide-react'
import { Card } from '@/shared/components/ui'

const HEADERS = ['CLIENTE', 'MASCOTA', 'TELÉFONOS', 'TIPO DE EVENTO'] as const

const SAMPLE_ROWS = [
  ['María Flores', 'Nala', '987 654 321', 'Vacuna'],
  ['Jorge Peña', 'Roco#', '912 345 678 · (FIJO)', 'Desparasitación'],
]

export function FormatPanel() {
  return (
    <Card className="p-5 flex flex-col gap-4">
      <p className="text-sm font-semibold text-ink flex items-center gap-2">
        <span className="rounded-sm bg-vegetal-soft text-vegetal p-1.5">
          <FileSpreadsheet size={14} />
        </span>
        El Excel debe traer
      </p>

      {/* Miniature worksheet replica */}
      <div className="rounded-sm border border-mist overflow-hidden text-left">
        <div className="grid grid-cols-4 text-2xs font-semibold text-vegetal bg-vegetal-soft/70 border-b border-mist">
          {HEADERS.map((h) => (
            <span key={h} className="px-2 py-1.5 truncate">
              {h}
            </span>
          ))}
        </div>
        {SAMPLE_ROWS.map((cells) => (
          <div
            key={cells[0]}
            className="grid grid-cols-4 text-2xs text-ink-soft border-t border-mist/70 bg-paper"
          >
            {cells.map((c, i) => (
              <span
                key={i}
                className={`px-2 py-1.5 truncate ${i === 2 ? 'font-mono tnum' : ''}`}
              >
                {c}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="-mt-2 text-2xs text-ink-mute">
        Así es el "Reporte de eventos pendientes" de VetPraxis — con esas
        columnas. Otras columnas extra del reporte se ignoran automáticamente.
      </p>

      <div className="border-t border-mist pt-3 space-y-1.5">
        <Tip text="Formato .xlsx o .xls · hasta 10 MB" />
        <Tip text="Un teléfono válido por fila (empieza con 9)" />
      </div>
    </Card>
  )
}

function Tip({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2 text-2xs text-ink-soft">
      <CheckCircle2 size={12} className="text-vegetal shrink-0 mt-0.5" />
      {text}
    </p>
  )
}
