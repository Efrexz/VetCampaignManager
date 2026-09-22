/**
 * Pure campaign-history aggregations. No React, no storage, no network.
 *
 * All functions filter out demo sends (`mock === true`) so dashboards report
 * real numbers only. Failed campaigns count as 0 messages (nothing left the
 * webhook), but their import-time counters (invalid/duplicate/excluded) still
 * reflect the work done and are included.
 */
import type { CampaignRecord } from './types'

export interface CampaignTotals {
  campaigns: number
  /** Messages dispatched (enabled recipients of successful sends). */
  messages: number
  invalid: number
  duplicate: number
  excluded: number
}

export function isRealCampaign(r: CampaignRecord): boolean {
  return !r.mock
}

export function aggregateCampaigns(records: CampaignRecord[]): CampaignTotals {
  const real = records.filter(isRealCampaign)
  const sum = (pick: (r: CampaignRecord) => number) =>
    real.reduce((acc, r) => acc + pick(r), 0)
  return {
    campaigns: real.length,
    messages: sum((r) => (r.status === 'sent' ? r.enabledRecipients : 0)),
    invalid: sum((r) => r.invalidRecipients),
    duplicate: sum((r) => r.duplicateRecipients),
    excluded: sum((r) => r.excludedRecipients ?? 0),
  }
}

// ── Campaign detail (per-category breakdown) ─────────────────────────────────

export interface CategoryCount {
  category: string
  count: number
}

/**
 * Count the messages of a campaign by category, straight from the stored
 * payload (which carries one entry per dispatched recipient). Pure and
 * defensive: malformed payloads yield []. Includes "Sin categoría" entries.
 */
export function sentByCategory(record: CampaignRecord): CategoryCount[] {
  const payload = record.payload as
    | { recipients?: Array<{ category?: unknown }> | unknown }
    | null
  const recipients = (payload && typeof payload === 'object'
    ? (payload as { recipients?: unknown }).recipients
    : undefined) as Array<{ category?: unknown }> | undefined
  const counts = new Map<string, number>()
  if (Array.isArray(recipients)) {
    for (const r of recipients) {
      const name =
        typeof r?.category === 'string' && r.category.trim() !== ''
          ? r.category.trim()
          : 'Sin categoría'
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
}

// ── Dashboard ranges (day / week / month) ─────────────────────────────────────


export type DashboardRange = 'day' | 'week' | 'month'

/** Start of the selected window in the browser's local timezone. */
export function rangeStart(range: DashboardRange, now = new Date()): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === 'day') return today
  if (range === 'week') {
    const d = new Date(today)
    d.setDate(d.getDate() - 6)
    return d
  }
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

/** Real campaigns whose `createdAt` falls inside the selected window. */
export function filterByRange(
  records: CampaignRecord[],
  range: DashboardRange,
  now = new Date(),
): CampaignRecord[] {
  const start = rangeStart(range, now).getTime()
  return records.filter((r) => {
    if (!isRealCampaign(r)) return false
    const t = new Date(r.createdAt).getTime()
    return !Number.isNaN(t) && t >= start
  })
}

/** 'YYYY-MM-DD' in the browser's local timezone. Accepts ISO strings or Dates. */
export function dayKey(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Human label for a 'YYYY-MM-DD' key, e.g. "lun 15". */
export function dayBucketLabel(key: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return key
  const [y, m, day] = key.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  const weekday = d
    .toLocaleDateString('es-PE', { weekday: 'short' })
    .replace('.', '')
  return `${weekday} ${day}`
}

/** Full human label for a 'YYYY-MM-DD' key, e.g. "lun 15 sep". */
export function dayFullLabel(key: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return key
  const [y, m, day] = key.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  return d
    .toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\./g, '')
}

export interface DayBucket {
  key: string
  label: string
  totals: CampaignTotals
}

export function emptyDayBucket(key: string): DayBucket {
  return {
    key,
    label: dayBucketLabel(key),
    totals: { campaigns: 0, messages: 0, invalid: 0, duplicate: 0, excluded: 0 },
  }
}

/**
 * Group real campaigns into the last `days` calendar days (today included),
 * zero-filled, ordered oldest → newest.
 */
export function groupByDay(
  records: CampaignRecord[],
  days: number,
  now = new Date(),
): DayBucket[] {
  const today = now
  const keys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    keys.push(dayKey(d))
  }
  const byDay = new Map<string, CampaignRecord[]>()
  for (const r of records.filter(isRealCampaign)) {
    const key = dayKey(r.createdAt)
    if (!keys.includes(key)) continue
    const bucket = byDay.get(key) ?? []
    bucket.push(r)
    byDay.set(key, bucket)
  }
  return keys.map((key) => {
    const recs = byDay.get(key) ?? []
    return { key, label: dayBucketLabel(key), totals: aggregateCampaigns(recs) }
  })
}

/** Real campaigns in the last `days` calendar days (today included). */
export function filterByLastDays(
  records: CampaignRecord[],
  days: number,
  now = new Date(),
): CampaignRecord[] {
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - (days - 1),
  ).getTime()
  return records.filter((r) => {
    if (!isRealCampaign(r)) return false
    const t = new Date(r.createdAt).getTime()
    return !Number.isNaN(t) && t >= start
  })
}

/** Real campaigns in the last `months` calendar months (current included). */
export function filterByLastMonths(
  records: CampaignRecord[],
  months = 6,
  now = new Date(),
): CampaignRecord[] {
  const start = new Date(
    now.getFullYear(),
    now.getMonth() - (months - 1),
    1,
  ).getTime()
  return records.filter((r) => {
    if (!isRealCampaign(r)) return false
    const t = new Date(r.createdAt).getTime()
    return !Number.isNaN(t) && t >= start
  })
}

/** Real campaigns inside one calendar month ('YYYY-MM', local timezone). */
export function filterByMonth(
  records: CampaignRecord[],
  key: string,
): CampaignRecord[] {
  return records.filter((r) => isRealCampaign(r) && monthKey(r.createdAt) === key)
}

/** Number of calendar days in a 'YYYY-MM' month. */
export function daysInMonthKey(key: string): number {
  if (!/^\d{4}-\d{2}$/.test(key)) return 31
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/**
 * Daily buckets for one specific month ('YYYY-MM'). Past months get all of
 * their days zero-filled; the current month only up to today, so no empty
 * "future" bars.
 */
export function groupByDayInMonth(
  records: CampaignRecord[],
  key: string,
  now = new Date(),
): DayBucket[] {
  if (!/^\d{4}-\d{2}$/.test(key)) return []
  const [y, m] = key.split('-').map(Number)
  const isCurrentMonth = y === now.getFullYear() && m - 1 === now.getMonth()
  const lastDay = isCurrentMonth ? now.getDate() : daysInMonthKey(key)
  const keys: string[] = []
  for (let day = 1; day <= lastDay; day++) {
    keys.push(dayKey(new Date(y, m - 1, day)))
  }
  const byDay = new Map<string, CampaignRecord[]>()
  for (const r of records.filter(isRealCampaign)) {
    const k = dayKey(r.createdAt)
    if (!keys.includes(k)) continue
    const bucket = byDay.get(k) ?? []
    bucket.push(r)
    byDay.set(k, bucket)
  }
  return keys.map((k) => ({
    key: k,
    label: dayBucketLabel(k),
    totals: aggregateCampaigns(byDay.get(k) ?? []),
  }))
}

/** Number of calendar days elapsed in the current month (today included). */
export function elapsedMonthDays(now = new Date()): number {
  return now.getDate()
}

/** 'YYYY-MM' in the browser's local timezone. */
export function monthKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  return `${y}-${m}`
}

/** Human label for a 'YYYY-MM' key, e.g. "sep 2026". */
export function monthLabel(key: string): string {
  if (!/^\d{4}-\d{2}$/.test(key)) return key
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const label = d.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' })
  return label.replace('.', '').replace(' de ', ' ')
}

export interface MonthBucket {
  key: string
  label: string
  totals: CampaignTotals
}

/**
 * Group real campaigns into the last `lastN` months (current month included),
 * zero-filled, ordered oldest → newest.
 */
export function groupByMonth(
  records: CampaignRecord[],
  lastN = 2,
): MonthBucket[] {
  const now = new Date()
  const keys: string[] = []
  for (let i = lastN - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = `${d.getMonth() + 1}`.padStart(2, '0')
    keys.push(`${y}-${m}`)
  }
  const byMonth = new Map<string, CampaignRecord[]>()
  for (const r of records.filter(isRealCampaign)) {
    const key = monthKey(r.createdAt)
    if (!keys.includes(key)) continue
    const bucket = byMonth.get(key) ?? []
    bucket.push(r)
    byMonth.set(key, bucket)
  }
  return keys.map((key) => ({
    key,
    label: monthLabel(key),
    totals: aggregateCampaigns(byMonth.get(key) ?? []),
  }))
}

export interface BranchBucket {
  branch: string
  totals: CampaignTotals
}

/**
 * Group real campaigns by branch (sede). Records without a branch label fall
 * into "Sin sede". Ordered by messages, descending.
 */
export function groupByBranch(records: CampaignRecord[]): BranchBucket[] {
  const byBranch = new Map<string, CampaignRecord[]>()
  for (const r of records.filter(isRealCampaign)) {
    const branch = r.branch?.trim() || 'Sin sede'
    const bucket = byBranch.get(branch) ?? []
    bucket.push(r)
    byBranch.set(branch, bucket)
  }
  return [...byBranch.entries()]
    .map(([branch, recs]) => ({ branch, totals: aggregateCampaigns(recs) }))
    .sort((a, b) => b.totals.messages - a.totals.messages)
}
