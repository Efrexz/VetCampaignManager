import { newId } from '@/lib/id'
import { getJSON, setJSON } from './storage'
import { KEYS } from './keys'
import type { Category } from '@/lib/types'

export async function listCategories(): Promise<Category[]> {
  return getJSON<Category[]>(KEYS.categories, [])
}

export async function saveCategory(c: Category): Promise<Category> {
  const list = await listCategories()
  const idx = list.findIndex((x) => x.id === c.id)
  if (idx === -1) list.push(c)
  else list[idx] = c
  await setJSON(KEYS.categories, list)
  return c
}

export async function deleteCategory(id: string): Promise<void> {
  const list = await listCategories()
  const next = list.filter((c) => c.id !== id)
  await setJSON(KEYS.categories, next)
}

export async function findCategoryByName(
  name: string,
): Promise<Category | undefined> {
  const list = await listCategories()
  const target = name.trim().toLowerCase()
  return list.find((c) => c.name.trim().toLowerCase() === target)
}

export function makeCategory(name: string): Category {
  return { id: newId(), name: name.trim() }
}