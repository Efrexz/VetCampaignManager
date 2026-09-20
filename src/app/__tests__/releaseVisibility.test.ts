import { describe, expect, test } from 'vitest'
import type { ReleaseEntry } from '@/app/releaseNotes'
import {
  releaseBadgeCount,
  shouldAnnounceReleases,
  unseenReleaseEntries,
} from '../releaseVisibility'

const notes: ReleaseEntry[] = [
  { id: '2026-09-19', date: 'd', title: 't', items: [], relevant: true },
  { id: '2026-06-01', date: 'd', title: 't', items: [], relevant: true },
  { id: '2026-05-15', date: 'd', title: 't', items: [], relevant: false },
]

describe('unseenReleaseEntries', () => {
  test('nothing seen yet → all relevant entries, ignore cosmetic ones', () => {
    const seen = unseenReleaseEntries(null, notes)
    expect(seen.map((n) => n.id)).toEqual(['2026-09-19', '2026-06-01'])
  })

  test('seen the oldest relevant → only newer ones count', () => {
    const seen = unseenReleaseEntries('2026-06-01', notes)
    expect(seen.map((n) => n.id)).toEqual(['2026-09-19'])
  })

  test('seen the latest → badge clears', () => {
    expect(unseenReleaseEntries('2026-09-19', notes)).toEqual([])
  })
})

describe('releaseBadgeCount / shouldAnnounceReleases', () => {
  test('badge counts relevant-unseen and drives the announcement', () => {
    expect(releaseBadgeCount(null, notes)).toBe(2)
    expect(releaseBadgeCount('2026-06-01', notes)).toBe(1)
    expect(releaseBadgeCount('2026-09-19', notes)).toBe(0)
    expect(shouldAnnounceReleases('2026-06-01', notes)).toBe(true)
    expect(shouldAnnounceReleases('2026-09-19', notes)).toBe(false)
  })
})
