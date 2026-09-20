/**
 * Contact ledger over localStorage (branch-scoped by construction: the
 * localStorage mode is single-sede). Same signatures as the Supabase
 * implementation so the storage seam holds.
 *
 * The ledger answers three questions at import time:
 *   - has this branch contacted this phone for a category recently?
 *     (re-contact guard, per-category via migration 0007)
 *   - is this phone flagged "NO CONTACTAR" (exclusion list)?
 * and records `last_contacted_at` + `last_contacts` on every real dispatch.
 */
import { newId } from '@/lib/id'
import { normalizeCategoryName } from '@/lib/campaign'
import { getJSON, setJSON } from './storage'
import { KEYS } from './keys'
import type {
  ContactState,
  ContactExclusion,
  ContactFlagEntry,
} from '@/lib/types'

interface ContactRecord {
  id: string
  phone: string
  ownerName: string
  petName: string
  doNotContact: boolean
  lastContactedAt: string | null
  /** Category name → ISO timestamp of the last send of that service. */
  lastContacts: Record<string, string>
  /** Why this client is excluded (free text, shown in UI). */
  note?: string
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

/**
 * Toggle the per-phone "NO CONTACTAR" flag (exclusion list). Upserts the
 * contact row when it does not exist yet; never touches the timestamps.
 * One client with several phones → the caller passes one entry per phone
 * (same note). Storage stays phone-keyed as the ledger demands.
 */
export async function setContactFlags(
  entries: ContactFlagEntry[],
): Promise<void> {
  if (entries.length === 0) return
  const list = await listContacts()
  const byPhone = new Map(list.map((c) => [c.phone, c]))
  for (const entry of entries) {
    const existing = byPhone.get(entry.phone)
    if (existing) {
      existing.doNotContact = entry.doNotContact
      if (entry.ownerName?.trim()) existing.ownerName = entry.ownerName.trim()
      if (entry.petName?.trim()) existing.petName = entry.petName.trim()
      if (entry.note?.trim()) existing.note = entry.note.trim()
      if (!entry.doNotContact) existing.note = undefined
    } else {
      const record: ContactRecord = {
        id: newId(),
        phone: entry.phone,
        ownerName: entry.ownerName?.trim() ?? '',
        petName: entry.petName?.trim() ?? '',
        doNotContact: entry.doNotContact,
        lastContactedAt: null,
        lastContacts: {},
        note: entry.doNotContact ? entry.note?.trim() : undefined,
      }
      byPhone.set(record.phone, record)
    }
  }
  await setJSON(KEYS.contacts, [...byPhone.values()])
}

/** Exclusion-list rows for the Settings tab, sorted by phone. */
export async function listContactExclusions(): Promise<ContactExclusion[]> {
  const list = await listContacts()
  return list
    .filter((c) => c.doNotContact)
    .sort((a, b) => a.phone.localeCompare(b.phone))
    .map((c) => ({
      phone: c.phone,
      ownerName: c.ownerName,
      petName: c.petName,
      note: c.note,
    }))
}
