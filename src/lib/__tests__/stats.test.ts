import { describe, expect, test } from 'vitest'
import {
  aggregateCampaigns,
  dayBucketLabel,
  dayKey,
  daysInMonthKey,
  elapsedMonthDays,
  filterByLastMonths,
  filterByMonth,
  filterByRange,
  groupByBranch,
  groupByDay,
  groupByDayInMonth,
  groupByMonth,
  isRealCampaign,
  monthKey,
  monthLabel,
  rangeStart,
  sentByCategory,
  type DayBucket,
  type MonthBucket,
} from '../stats'
import type { CampaignRecord } from '../types'

function record(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    id: 'r1',
    sentBy: '',
    totalRecipients: 10,
    enabledRecipients: 8,
    invalidRecipients: 1,
    duplicateRecipients: 1,
    payload: {},
    status: 'sent',
    errorMessage: null,
    createdAt: '2026-09-10T12:00:00.000Z',
    ...overrides,
  }
}

describe('isRealCampaign', () => {
  test('mock sends are not real', () => {
    expect(isRealCampaign(record({ mock: true }))).toBe(false)
    expect(isRealCampaign(record())).toBe(true)
  })
})

describe('aggregateCampaigns', () => {
  test('sums real sends and ignores demo sends', () => {
    const totals = aggregateCampaigns([
      record(),
      record({ id: 'r2', enabledRecipients: 12 }),
      record({ id: 'r3', mock: true, enabledRecipients: 100 }),
    ])
    expect(totals.campaigns).toBe(2)
    expect(totals.messages).toBe(20)
    expect(totals.invalid).toBe(2)
    expect(totals.duplicate).toBe(2)
    expect(totals.excluded).toBe(0)
  })

  test('failed campaigns contribute 0 messages but keep import counters', () => {
    const totals = aggregateCampaigns([
      record(),
      record({ id: 'r2', status: 'failed', enabledRecipients: 8, excludedRecipients: 3 }),
    ])
    expect(totals.messages).toBe(8)
    expect(totals.excluded).toBe(3)
    expect(totals.campaigns).toBe(2)
  })

  test('excluded defaults to 0 for legacy records', () => {
    expect(aggregateCampaigns([record()]).excluded).toBe(0)
  })
})

describe('monthKey / monthLabel', () => {
  test('key is YYYY-MM local', () => {
    expect(monthKey('2026-09-10T12:00:00.000Z')).toBe('2026-09')
    expect(monthKey('not-a-date')).toBe('')
  })

  test('label is human readable', () => {
    expect(monthLabel('2026-09')).toMatch(/2026/)
  })
})

describe('groupByMonth', () => {
  test('zero-fills missing months and orders oldest first', () => {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonth = `${prev.getFullYear()}-${`${prev.getMonth() + 1}`.padStart(2, '0')}`

    const buckets: MonthBucket[] = groupByMonth([
      record({ createdAt: `${thisMonth}-15T10:00:00.000Z`, enabledRecipients: 5 }),
      record({ createdAt: `${lastMonth}-05T10:00:00.000Z`, enabledRecipients: 3 }),
      record({ mock: true, createdAt: `${thisMonth}-16T10:00:00.000Z` }),
    ], 2)

    expect(buckets.map((b) => b.key)).toEqual([lastMonth, thisMonth])
    expect(buckets[0].totals.messages).toBe(3)
    expect(buckets[1].totals.messages).toBe(5)
    expect(buckets[1].totals.campaigns).toBe(1)
  })

  test('ignores records older than the window', () => {
    const buckets = groupByMonth(
      [record({ createdAt: '2020-01-01T00:00:00.000Z' })],
      2,
    )
    expect(buckets.every((b) => b.totals.campaigns === 0)).toBe(true)
  })
})

describe('dayKey / dayBucketLabel', () => {
  test('key is YYYY-MM-DD local, safe for Date inputs', () => {
    expect(dayKey('2026-09-10T05:00:00.000Z')).toBe('2026-09-10')
    expect(dayKey('not-a-date')).toBe('')
    // Local midnight of a UTC+5-style offset must not shift a day.
    const localMid = new Date(2026, 8, 17, 0, 0, 0)
    expect(dayKey(localMid)).toBe('2026-09-17')
  })

  test('label is short and human readable', () => {
    expect(dayBucketLabel('2026-09-15')).toMatch(/15/)
  })
})

describe('rangeStart', () => {
  test('day → today 00:00, week → 6 days back, month → 1st of month', () => {
    const now = new Date(2026, 8, 17, 15, 30)
    expect(rangeStart('day', now).getTime()).toBe(new Date(2026, 8, 17).getTime())
    expect(rangeStart('week', now).getTime()).toBe(new Date(2026, 8, 11).getTime())
    expect(rangeStart('month', now).getTime()).toBe(new Date(2026, 8, 1).getTime())
  })
})

describe('filterByRange', () => {
  test('filters real campaigns inside the window, drops mocks and older', () => {
    const now = new Date(2026, 8, 17, 12, 0)
    const recs = [
      record({ id: 'today', createdAt: '2026-09-17T10:00:00.000Z' }),
      record({ id: 'mock', mock: true, createdAt: '2026-09-17T10:00:00.000Z' }),
      record({ id: 'old', createdAt: '2020-01-01T00:00:00.000Z' }),
    ]
    const r = filterByRange(recs, 'week', now)
    expect(r.map((x) => x.id)).toEqual(['today'])
  })
})

describe('groupByDay', () => {
  test('zero-fills last N days, today last, and aggregates per day', () => {
    const now = new Date(2026, 8, 17, 12, 0)
    const recs = [
      record({ id: 'a', createdAt: '2026-09-16T10:00:00.000Z', enabledRecipients: 5 }),
      record({ id: 'b', mock: true, createdAt: '2026-09-16T10:00:00.000Z' }),
      record({ id: 'c', createdAt: '2020-01-01T00:00:00.000Z' }),
    ]
    const buckets: DayBucket[] = groupByDay(recs, 3, now)
    expect(buckets).toHaveLength(3)
    const [prev, mid, today] = buckets
    expect(today.totals.messages).toBe(0) // today zero-filled
    expect(mid.totals.messages).toBe(5) // yesterday's real send
    expect(prev.totals.messages).toBe(0)
    expect(buckets[buckets.length - 1].key).toBe('2026-09-17')
  })
})

describe('elapsedMonthDays', () => {
  test('equals the day-of-month (today included)', () => {
    expect(elapsedMonthDays(new Date(2026, 8, 17, 23, 59))).toBe(17)
    expect(elapsedMonthDays(new Date(2026, 8, 1, 0, 1))).toBe(1)
  })
})

describe('filterByMonth / filterByLastMonths / groupByDayInMonth', () => {
  test('filterByMonth keeps only real campaigns of the given month', () => {
    const recs = [
      record({ id: 'in', createdAt: '2026-09-05T10:00:00.000Z' }),
      record({ id: 'other', createdAt: '2026-08-05T10:00:00.000Z' }),
      record({ id: 'demo', mock: true, createdAt: '2026-09-05T10:00:00.000Z' }),
    ]
    expect(filterByMonth(recs, '2026-09').map((r) => r.id)).toEqual(['in'])
  })

  test('filterByLastMonths keeps the 6 months back (current included)', () => {
    const now = new Date(2026, 8, 17) // Sep 2026 → window Apr 1 .. Sep 30
    const recs = [
      record({ id: 'thisMonth', createdAt: '2026-09-05T10:00:00.000Z' }),
      record({ id: 'sixBack', createdAt: '2026-04-05T10:00:00.000Z' }),
      record({ id: 'sevenBack', createdAt: '2026-03-31T23:00:00.000Z' }),
    ]
    expect(filterByLastMonths(recs, 6, now).map((r) => r.id)).toEqual([
      'thisMonth',
      'sixBack',
    ])
  })

  test('daysInMonthKey is calendar-accurate', () => {
    expect(daysInMonthKey('2026-09')).toBe(30)
    expect(daysInMonthKey('2026-02')).toBe(28)
    expect(daysInMonthKey('2024-02')).toBe(29)
  })

  test('groupByDayInMonth: current month fills up to today, past month is complete', () => {
    const now = new Date(2026, 8, 17, 12, 0)
    const recs = [
      record({ id: 'a', createdAt: '2026-09-03T10:00:00.000Z', enabledRecipients: 5 }),
      record({ id: 'b', createdAt: '2026-09-20T10:00:00.000Z' }),
    ]
    const current: DayBucket[] = groupByDayInMonth(recs, '2026-09', now)
    expect(current).toHaveLength(17) // no future bars
    expect(current[2].totals.messages).toBe(5)

    const past: DayBucket[] = groupByDayInMonth(recs, '2026-08', now)
    expect(past).toHaveLength(31)
    expect(past.every((b) => b.totals.messages === 0)).toBe(true)
  })
})

describe('sentByCategory', () => {
  const recordWithRecipients = (recipients: unknown, overrides: Partial<CampaignRecord> = {}) =>
    record({ payload: { schema: 'vetcampaign/v1', recipients }, ...overrides })

  test('counts messages per category, sorted by count desc', () => {
    const rec = recordWithRecipients([
      { id: '1', category: 'Baño' },
      { id: '2', category: 'Vacuna' },
      { id: '3', category: 'Baño' },
      { id: '4', category: 'Baño' },
    ])
    expect(sentByCategory(rec)).toEqual([
      { category: 'Baño', count: 3 },
      { category: 'Vacuna', count: 1 },
    ])
  })

  test('blank categories fall into Sin categoría', () => {
    const rec = recordWithRecipients([
      { id: '1', category: '  ' },
      { id: '2' },
    ])
    expect(sentByCategory(rec)).toEqual([{ category: 'Sin categoría', count: 2 }])
  })

  test('malformed payloads yield an empty breakdown', () => {
    expect(sentByCategory(record({ payload: null }))).toEqual([])
    expect(sentByCategory(record({ payload: 'garbage' }))).toEqual([])
    expect(sentByCategory(record({ payload: { nope: true } }))).toEqual([])
  })
})

describe('groupByBranch', () => {
  test('groups by branch label, records without branch fall into Sin sede', () => {
    const buckets = groupByBranch([
      record({ branch: 'Sede Norte', enabledRecipients: 5 }),
      record({ branch: 'Sede Norte', enabledRecipients: 7 }),
      record({ enabledRecipients: 9 }),
    ])
    expect(buckets).toHaveLength(2)
    const norte = buckets.find((b) => b.branch === 'Sede Norte')
    expect(norte?.totals.campaigns).toBe(2)
    expect(norte?.totals.messages).toBe(12)
    const sinSede = buckets.find((b) => b.branch === 'Sin sede')
    expect(sinSede?.totals.messages).toBe(9)
  })

  test('sorts by messages descending', () => {
    const buckets = groupByBranch([
      record({ branch: 'Chica', enabledRecipients: 1 }),
      record({ branch: 'Grande', enabledRecipients: 50 }),
    ])
    expect(buckets[0].branch).toBe('Grande')
  })
})
