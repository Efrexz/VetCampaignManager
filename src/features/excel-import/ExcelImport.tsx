import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { ImportDropzone } from './ImportDropzone'
import { ImportSummary } from './ImportSummary'
import { useExcelImport } from './useExcelImport'
import { useCampaignStore } from '@/shared/stores/campaignStore'

export function ExcelImport() {
  const importState = useExcelImport()
  const { status, error } = importState
  const result = useCampaignStore((s) => s.result)
  const fileName = useCampaignStore((s) => s.rawFileName)
  const resetStore = useCampaignStore((s) => s.reset)

  const fullReset = () => {
    importState.reset()
    resetStore()
  }

  // Show the summary if we have a parsed result in memory.
  if (status === 'success' && result && fileName) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <ImportSummary
          result={result}
          fileName={fileName}
          onReset={fullReset}
        />
      </div>
    )
  }

  // Show the error card if parsing failed or no valid rows.
  if (status === 'error' && error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-md border border-danger/30 bg-danger-soft/30 p-5 flex flex-col items-start gap-3">
          <div className="flex items-start gap-3">
            <span className="rounded-sm bg-danger-soft text-danger p-2">
              <AlertTriangle size={18} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">
                No se pudo importar el archivo
              </p>
              <p className="text-sm text-ink-soft mt-1">{error.message}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={fullReset}>
            <RotateCcw size={14} />
            Intentar de nuevo
          </Button>
        </div>
      </div>
    )
  }

  // Default: dropzone.
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-ink">
          Importar archivo Excel
        </h2>
        <p className="text-sm text-ink-soft mt-1">
          Exporta el reporte desde VetPraxis y arrástralo aquí para revisar los
          destinatarios antes de enviar la campaña.
        </p>
      </div>

      <ImportDropzone importState={importState} />

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-ink-mute">
        <div className="rounded-sm bg-mist-soft/50 p-3">
          <p className="font-medium text-ink-soft mb-1">1. Exporta</p>
          En VetPraxis, genera el reporte de eventos pendientes en formato Excel.
        </div>
        <div className="rounded-sm bg-mist-soft/50 p-3">
          <p className="font-medium text-ink-soft mb-1">2. Importa</p>
          Arrastra el archivo aquí. Validaremos teléfonos y categorías.
        </div>
        <div className="rounded-sm bg-mist-soft/50 p-3">
          <p className="font-medium text-ink-soft mb-1">3. Revisa y envía</p>
          Previsualiza los mensajes y dispara la campaña a WhatsApp.
        </div>
      </div>
    </div>
  )
}