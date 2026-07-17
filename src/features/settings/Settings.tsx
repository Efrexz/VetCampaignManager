import { EmptyState } from '@/shared/components/ui'
import { Settings as SettingsIcon } from 'lucide-react'

export function Settings() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<SettingsIcon size={28} />}
        title="Ajustes"
        description="Categorías, plantillas de mensaje y configuración del webhook. (Próximamente en la Fase 2.)"
      />
    </div>
  )
}