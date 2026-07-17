import { EmptyState } from '@/shared/components/ui'
import { Table2 } from 'lucide-react'

export function CampaignPreview() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<Table2 size={28} />}
        title="Vista previa de la campaña"
        description="Aquí verás la tabla de destinatarios y la previsualización de cada mensaje. (Próximamente en la Fase 3.)"
      />
    </div>
  )
}