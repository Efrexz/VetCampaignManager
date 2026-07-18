import { useEffect } from 'react'
import { toast } from 'sonner'
import { useSettingsStore } from '@/shared/stores/settingsStore'

/**
 * Kick off settings hydration once on app mount. Renders a fallback wait
 * (parent can choose to render nothing) while loading.
 */
export function useHydrateSettings(): boolean {
  const hydrated = useSettingsStore((s) => s.hydrated)
  const hydrate = useSettingsStore((s) => s.hydrate)

  useEffect(() => {
    if (!hydrated) {
      hydrate().catch((err) => {
        console.error('hydrate failed', err)
        toast.error('No se pudo cargar la configuración.')
      })
    }
  }, [hydrated, hydrate])

  return hydrated
}