import { EmptyState } from '@/shared/components/ui'
import { FileSpreadsheet } from 'lucide-react'

export function ExcelImport() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<FileSpreadsheet size={28} />}
        title="Importar archivo Excel"
        description="Arrastra el archivo .xlsx exportado desde VetPraxis aquí. (Próximamente en la Fase 1.)"
      />
    </div>
  )
}