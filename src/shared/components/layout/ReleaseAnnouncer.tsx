import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  readLastSeenRelease,
  shouldAnnounceReleases,
} from '@/app/releaseVisibility'

/**
 * One-time startup nudge: when the app boots with relevant release notes
 * the user hasn't seen, fire a single toast pointing at the bell. The
 * badge keeps counting until they open it (see ReleaseNotesButton).
 */
export function ReleaseAnnouncer() {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    if (shouldAnnounceReleases(readLastSeenRelease())) {
      toast.info('Hay novedades para tu trabajo 👋', {
        description: 'Toca la campanita de Novedades, arriba a la derecha.',
        duration: 8000,
      })
    }
  }, [])
  return null
}
