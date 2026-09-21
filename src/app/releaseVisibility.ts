/**
 * Pure helpers for the release-notes feature: which entries are unseen given
 * a stored last-seen id, and the badge count (relevant entries only).
 * No React, no storage, no network.
 */
import { RELEASE_NOTES, type ReleaseEntry } from '@/app/releaseNotes'

/** localStorage key shared by the bell and the startup announcer. */
export const RELEASE_SEEN_KEY = 'vcm:releases:lastSeen:v1'

export function readLastSeenRelease(): string | null {
  try {
    return localStorage.getItem(RELEASE_SEEN_KEY)
  } catch {
    return null
  }
}

export function writeLastSeenRelease(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(RELEASE_SEEN_KEY)
    else localStorage.setItem(RELEASE_SEEN_KEY, id)
  } catch {
    // private-mode browsers etc.: badge just stays, harmless.
  }
}

/**
 * Entries strictly newer than the last one the user has seen. When nothing
 * was seen yet, every relevant entry counts (first-visit onboarding shows
 * the badge once they ship relevant news, not before).
 */
export function unseenReleaseEntries(
  lastSeenId: string | null,
  notes: ReleaseEntry[] = RELEASE_NOTES,
): ReleaseEntry[] {
  if (!lastSeenId) {
    return notes.filter((n) => n.relevant)
  }
  return notes.filter((n) => n.relevant && n.id > lastSeenId)
}

/** Badge count for the TopBar bell. */
export function releaseBadgeCount(
  lastSeenId: string | null,
  notes: ReleaseEntry[] = RELEASE_NOTES,
): number {
  return unseenReleaseEntries(lastSeenId, notes).length
}

/** True when the startup toast should fire (relevant news unseen). */
export function shouldAnnounceReleases(
  lastSeenId: string | null,
  notes: ReleaseEntry[] = RELEASE_NOTES,
): boolean {
  return unseenReleaseEntries(lastSeenId, notes).length > 0
}
