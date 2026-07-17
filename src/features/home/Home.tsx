import { useNavigate } from 'react-router-dom'
import { FileSpreadsheet, ArrowRight } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { EmptyState } from '@/shared/components/ui'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="h-full flex items-center justify-center p-6">
      <EmptyState
        icon={<FileSpreadsheet size={28} />}
        title="Listo para enviar una campaña"
        description="Importa el archivo Excel exportado desde VetPraxis, revisa los destinatarios y envía los mensajes de WhatsApp en minutos."
        action={
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/campaign')}
          >
            Importar Excel
            <ArrowRight size={16} />
          </Button>
        }
        className="max-w-md"
      />
    </div>
  )
}