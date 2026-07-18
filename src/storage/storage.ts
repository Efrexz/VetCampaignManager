/**
 * localStorage JSON helpers with a versioned envelope.
 *
 * Every key stores `{ version: number, data: T }`. The version lives in
 * `storage/keys.ts` (encoded in the key suffix) so a schema bump means
 * writing to a different key — old data is preserved untouched.
 *
 * All functions are async, even though localStorage is synchronous, so the
 * seam matches a future Supabase implementation (same signatures).
 */
const NAMESPACE = 'vcm'

export interface Envelope<T> {
  version: number
  data: T
}

export async function getJSON<T>(
  key: string,
  fallback: T,
): Promise<T> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Envelope<T>
    if (!parsed || typeof parsed !== 'object') return fallback
    if (!('data' in parsed)) return fallback
    return parsed.data
  } catch {
    return fallback
  }
}

export async function setJSON<T>(key: string, data: T): Promise<void> {
  try {
    const env: Envelope<T> = { version: 1, data }
    localStorage.setItem(key, JSON.stringify(env))
  } catch (err) {
    // QuotaExceededError or similar — caller may surface a toast.
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new Error('No hay espacio suficiente en el navegador.')
    }
    throw err
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function namespaced(local: string): string {
  return `${NAMESPACE}:${local}`
}