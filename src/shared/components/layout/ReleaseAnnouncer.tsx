import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { shouldAnnounceReleases } from '@/app/releaseVisibility'

/**
 * One-time startup nudge: when the app boots with relevant release notes
 * the user hasn't seen, fire a single toast pointing at the bell. The
 * badge keeps counting until they open it (readLastSeen lives in the
 * ReleaseNotesButton local state, so we re-read localStorage here).
 */
const STORAGE_KEY = 'vcm:releases:lastSeen:v1'

export function ReleaseAnnouncer() {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    let lastSeen: string | null = null
    try {
      lastSeen = localStorage.getItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    if (shouldAnnounceReleases(lastSeen)) {
      toast.info('Hay novedades para tu trabajo 👋', {
        description: 'Toca la campanita de Novedades, arriba a la derecha.',
        duration: 8000,
      })
    }
  }, [])
  return null
}
