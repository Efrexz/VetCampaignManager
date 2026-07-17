import { customAlphabet } from 'nanoid'

// URL-safe, lowercase id (avoids phone/keyboard confusion chars)
const makeId = customAlphabet('0123456789abcdefghjkmnpqrstuvwxyz', 20)

export function newId(): string {
  return makeId()
}