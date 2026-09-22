/**
 * Modern top bar: cream canvas (no flat white plane), contextual title with
 * a breadcrumb-style sub-label. The campaign-flow stepper lives in a floating
 * chip so it reads as progress, not chrome.
 */
import { useLocation } from 'react-router-dom'
import { Stepper, type StepperStep } from '@/shared/components/ui/Stepper'
import { BranchContext } from './BranchContext'
import { ReleaseNotesButton } from './ReleaseNotesButton'
import { APP } from '@/app/env'

const steps: StepperStep[] = [
  { id: 'import', label: 'Importar' },
  { id: 'preview', label: 'Revisar' },
  { id: 'send', label: 'Enviar' },
]

const CRUMB: Record<string, { title: string; sub: string }> = {
  '/settings': { title: 'Ajustes', sub: 'Plantillas, categorías y conexión' },
  '/history': { title: 'Historial', sub: 'Detalle de campañas enviadas' },
}

export function TopBar() {
  const { pathname } = useLocation()
  const isCampaign = pathname.startsWith('/campaign')

  const stepByPath: Record<string, number> = {
    '/campaign': 0,
    '/campaign/preview': 1,
    '/campaign/send': 2,
  }
  const stepIndex = stepByPath[pathname] ?? -1

  const crumb = isCampaign
    ? {
        title: 'Nueva campaña',
        sub: `Flujo · ${steps[stepIndex >= 0 ? stepIndex : 0]?.label ?? ''}`,
      }
    : (CRUMB[pathname] ?? { title: APP.productName, sub: 'Resumen de hoy' })

  return (
    <header className="h-topbar shrink-0 flex items-center justify-between px-5 pt-1">
      <div className="flex items-baseline gap-3 min-w-0">
        <h1 className="text-lg font-semibold text-ink leading-none tracking-tight">
          {crumb.title}
        </h1>
        <span className="text-xs text-ink-mute hidden sm:block truncate">
          {crumb.sub}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <ReleaseNotesButton />
        <BranchContext />
        {isCampaign && stepIndex >= 0 && (
          <div className="rounded-md bg-paper border border-mist shadow-card px-2 py-1">
            <Stepper steps={steps} currentIndex={stepIndex} />
          </div>
        )}
      </div>
    </header>
  )
}
