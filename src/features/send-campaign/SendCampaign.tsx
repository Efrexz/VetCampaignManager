import { EmptyState } from '@/shared/components/ui'
import { Send } from 'lucide-react'

export function SendCampaign() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<Send size={28} />}
        title="Enviar campaña"
        description="Revisa el envío y dispara la campaña hacia n8n. (Próximamente en la Fase 4.)"
      />
    </div>
  )
}