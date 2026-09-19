/**
 * Contact ledger over localStorage (branch-scoped by construction: the
 * localStorage mode is single-sede). Same signatures as the Supabase
 * implementation so the storage seam holds.
 *
 * The ledger answers two questions at import time:
 *   - has this branch contacted this phone recently? (re-contact guard)
 *   - is this phone flagged "NO CONTACTAR"?
 * and records `last_contacted_at` on every real dispatch.
 */
import { newId } from '@/lib/id'
import { normalizeCategoryName } from '@/lib/campaign'
import { getJSON, setJSON } from './storage'
import { KEYS } from './keys'
import type { ContactState } from '@/lib/types'

interface ContactRecord {
  id: string
  phone: string
  ownerName: string
  petName: string
  doNotContact: boolean
  lastContactedAt: string | null
  /** Category name → ISO timestamp of the last send of that service. */
  lastContacts: Record<string, string>
}

export interface ContactEntry {
  phone: string
  ownerName: string
  petName: string
  /** Category that was just sent (recorded in the per-category ledger). */
  category?: string
}

async function listContacts(): Promise<ContactRecord[]> {
  return getJSON<ContactRecord[]>(KEYS.contacts, [])
}

export async function findContactStates(
  phones: string[],
): Promise<Map<string, ContactState>> {
  const wanted = new Set(phones)
  const list = await listContacts()
  const states = new Map<string, ContactState>()
  for (const c of list) {
    if (!wanted.has(c.phone)) continue
    states.set(c.phone, {
      lastContactedAt: c.lastContactedAt ?? undefined,
      lastContacts: c.lastContacts,
      doNotContact: c.doNotContact,
    })
  }
  return states
}

export async function markContacted(entries: ContactEntry[]): Promise<void> {
  if (entries.length === 0) return
  const now = new Date().toISOString()
  const list = await listContacts()
  const byPhone = new Map(list.map((c) => [c.phone, c]))
  for (const entry of entries) {
    const existing = byPhone.get(entry.phone)
    if (existing) {
      existing.ownerName = entry.ownerName || existing.ownerName
      existing.petName = entry.petName || existing.petName
      existing.lastContactedAt = now
      if (entry.category) {
        existing.lastContacts = {
          ...existing.lastContacts,
          [normalizeCategoryName(entry.category)]: now,
        }
      }
    } else {
      const record: ContactRecord = {
        id: newId(),
        phone: entry.phone,
        ownerName: entry.ownerName,
        petName: entry.petName,
        doNotContact: false,
        lastContactedAt: now,
        lastContacts: entry.category
          ? { [normalizeCategoryName(entry.category)]: now }
          : {},
      }
      byPhone.set(record.phone, record)
    }
  }
  await setJSON(KEYS.contacts, [...byPhone.values()])
}
