/**
 * Pure grouping of validated recipients into sendable message units.
 *
 * Business rules (agreed with the clinic):
 *   - One message per phone + category. Pets sharing that category are all
 *     named in the message via {{pets}}.
 *   - A pet already covered by an earlier category (same phone) is DEFERRED:
 *     it is not sent a second message for another service. The doctor sells
 *     the rest at the appointment. (First service in file order wins.)
 *   - Exact duplicate rows (phone + pet + category seen before) are dropped
 *     silently — VetPraxis exports sometimes emit the same row twice.
 *
 * Group ids are deterministic (`phone|categoryId`), so UI state keyed by
 * them survives recomputation. No React, no storage, no network.
 */
import { normalizeCategoryName } from '@/lib/campaign'
import type { Recipient, RecipientGroup, GroupingResult } from '@/lib/types'

export function groupRecipients(recipients: Recipient[]): GroupingResult {
  const groupByKey = new Map<string, RecipientGroup>()
  const groups: RecipientGroup[] = []
  /** pet → group that already covers it (first category in file order wins). */
  const coveredBy = new Map<string, RecipientGroup>() // `${phone}|${pet}`
  let exactDuplicateRows = 0
  let deferredRows = 0

  // Only valid, sendable rows participate in grouping.
  const valid = recipients.filter(
    (r) => r.phoneStatus === 'valid' && r.normalizedPhone,
  )

  for (const r of valid) {
    const phone = r.normalizedPhone as string
    const pet = r.pet.trim()
    const catKey = normalizeCategoryName(r.category)
    const groupKey = `${phone}|${catKey}`
    const petKey = `${phone}|${pet}`
    const group = groupByKey.get(groupKey)

    // 1) Exact duplicate: same phone + category group already has this pet.
    if (group && pet && group.pets.includes(pet)) {
      exactDuplicateRows++
      continue
    }

    // 2) Deferred: the pet is already covered by an earlier category.
    if (pet && coveredBy.has(petKey)) {
      deferredRows++
      const winner = coveredBy.get(petKey)!
      winner.notes.push(
        `${pet}: también con "${r.category}" (fila ${r.rowNumber}). No se envía otro mensaje — el doctor lo verá en la consulta.`,
      )
      continue
    }

    // 3) Add to the group (create on first occurrence).
    const target =
      group ??
      (() => {
        const g: RecipientGroup = {
          id: groupKey,
          phone,
          owner: r.owner.trim() || 'Propietario',
          category: r.category,
          pets: [],
          recipients: [],
          notes: [],
        }
        groupByKey.set(groupKey, g)
        groups.push(g)
        return g
      })()

    if (pet && !target.pets.includes(pet)) target.pets.push(pet)
    target.recipients.push(r)
    if (pet) coveredBy.set(petKey, target)
  }

  return { groups, exactDuplicateRows, deferredRows }
}

/**
 * Join pet names the way the clinic writes WhatsApp messages in Spanish:
 *   1 → "Roco"; 2 → "Roco y Maxi"; 3+ → "Roco, Maxi y Firulais".
 */
export function joinPetNames(pets: string[]): string {
  if (pets.length === 0) return ''
  if (pets.length === 1) return pets[0]
  return `${pets.slice(0, -1).join(', ')} y ${pets[pets.length - 1]}`
}
