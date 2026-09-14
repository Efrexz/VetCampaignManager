import { useEffect } from 'react'
import { toast } from 'sonner'
import { useSettingsStore } from '@/shared/stores/settingsStore'
import { useTenantStore } from '@/shared/stores/tenantStore'
import { HAS_SUPABASE } from '@/integrations/supabase'

/**
 * Kick off settings hydration once the persistence context is ready.
 *
 * In Supabase mode the settings read/write the current BRANCH row, so
 * hydration must wait for the tenant store (tenant + branch context) to be
 * ready first. In localStorage mode there is nothing to wait for.
 *
 * Returns true when hydration finished (parent may keep a loading state
 * until then).
 */
export function useHydrateSettings(): boolean {
  const hydrated = useSettingsStore((s) => s.hydrated)
  const hydrate = useSettingsStore((s) => s.hydrate)
  const tenantHydrated = useTenantStore((s) => s.hydrated)
  const currentBranchId = useTenantStore((s) => s.currentBranchId)
  // Degenerate configurations (user without membership, or a tenant without
  // branches): DON'T spin forever — let the app render and the storage layer
  // produce its clear Spanish error instead of an opaque eternal spinner.
  const stuckWithoutContext = useTenantStore(
    (s) =>
      s.hydrated &&
      (s.tenants.length === 0 ||
        (s.tenants.length > 0 && s.branches.length === 0)),
  )

  // Supabase mode needs both a tenant AND a resolved branch (owner/admin get
  // branches[0] as default). localStorage mode is ready immediately.
  const ready =
    !HAS_SUPABASE ||
    (tenantHydrated && (currentBranchId !== null || stuckWithoutContext))

  useEffect(() => {
    if (!ready || hydrated) {
      return
    }
    hydrate().catch((err) => {
      console.error('hydrate failed', err)
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la configuración.',
      )
    })
  }, [ready, hydrated, hydrate])

  return ready && hydrated
}
