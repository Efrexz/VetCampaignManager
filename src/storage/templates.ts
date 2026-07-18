import { newId } from '@/lib/id'
import { getJSON, setJSON } from './storage'
import { KEYS } from './keys'
import type { MessageTemplate } from '@/lib/types'

export async function listTemplates(): Promise<MessageTemplate[]> {
  return getJSON<MessageTemplate[]>(KEYS.templates, [])
}

export async function saveTemplate(t: MessageTemplate): Promise<MessageTemplate> {
  const list = await listTemplates()
  const idx = list.findIndex((x) => x.id === t.id)
  if (idx === -1) list.push(t)
  else list[idx] = t

  // Enforce exactly-one-default invariant: if this one is default, unmark
  // the others. (At most one default overall.)
  if (t.isDefault) {
    for (const item of list) {
      if (item.id !== t.id && item.isDefault) item.isDefault = false
    }
  }

  await setJSON(KEYS.templates, list)
  return t
}

export async function deleteTemplate(id: string): Promise<void> {
  const list = await listTemplates()
  const next = list.filter((t) => t.id !== id)
  await setJSON(KEYS.templates, next)
}

/**
 * Reassign every template bound to the given categoryId to the default
 * (categoryId = null) template. Used when a category is deleted.
 * Returns the ids of the templates that were reassigned.
 */
export async function reassignTemplatesFromCategory(
  categoryId: string,
): Promise<string[]> {
  const list = await listTemplates()
  const reassigned: string[] = []
  for (const t of list) {
    if (t.categoryId === categoryId) {
      t.categoryId = null
      reassigned.push(t.id)
    }
  }
  await setJSON(KEYS.templates, list)
  return reassigned
}

export async function getTemplateForCategory(
  categoryId: string,
): Promise<MessageTemplate | undefined> {
  const list = await listTemplates()
  return list.find((t) => t.categoryId === categoryId)
}

export async function getDefaultTemplate(): Promise<MessageTemplate | undefined> {
  const list = await listTemplates()
  return list.find((t) => t.isDefault)
}

export function makeTemplate(input: {
  categoryId: string | null
  name: string
  body: string
  isDefault: boolean
}): MessageTemplate {
  return { id: newId(), ...input }
}