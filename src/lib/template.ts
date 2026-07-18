/**
 * Message template engine. Pure: no React, no storage, no network.
 *
 * Variables use the {{key}} syntax. The registry below is the single source
 * of truth for available variables — adding one is a one-line change.
 */
import type { Recipient } from '@/lib/types'

export interface VariableDef {
  /** Placeholder key as it appears in templates, without braces. */
  key: string
  /** Label shown in the editor's variable chips. */
  label: string
  /** Resolve the variable's value from a render context. */
  resolve: (ctx: RenderContext) => string
}

export interface RenderContext {
  owner: string
  pet: string
  category: string
  /** Open slot for future expansions (clinic_name, date, …). */
  [key: string]: string
}

export const VARIABLES: VariableDef[] = [
  { key: 'owner', label: 'Propietario', resolve: (c) => c.owner },
  { key: 'pet', label: 'Mascota', resolve: (c) => c.pet },
  { key: 'category', label: 'Categoría', resolve: (c) => c.category },
]

const VARIABLE_KEYS = new Set(VARIABLES.map((v) => v.key))

/** Match {{key}} with optional inner whitespace. */
const TOKEN_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g

export interface RenderResult {
  /** Final message with variables replaced. */
  text: string
  /** Variables referenced in the body that are not in the registry. */
  unknown: string[]
  /** Variables in the registry that were referenced. */
  used: string[]
  /** Variables referenced whose resolved value was empty. */
  empty: string[]
}

/**
 * Render a template body against a context. Unknown variables are left as-is
 * and reported; known variables resolved to empty are reported separately.
 */
export function renderTemplate(
  body: string,
  ctx: RenderContext,
): RenderResult {
  const unknown = new Set<string>()
  const used = new Set<string>()
  const empty = new Set<string>()

  const text = body.replace(TOKEN_RE, (full, key: string) => {
    used.add(key)
    if (!VARIABLE_KEYS.has(key)) {
      unknown.add(key)
      return full
    }
    const def = VARIABLES.find((v) => v.key === key)!
    const value = def.resolve(ctx) ?? ''
    if (!value) empty.add(key)
    return value
  })

  return {
    text,
    unknown: [...unknown],
    used: [...used],
    empty: [...empty],
  }
}

/**
 * List variable keys referenced in a body. Used by the editor to validate
 * without needing a context.
 */
export function extractVariables(body: string): string[] {
  const found = new Set<string>()
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(body)) !== null) {
    found.add(m[1])
  }
  return [...found]
}

/** Build a render context from a Recipient (used by Phase 3 campaign preview). */
export function contextFromRecipient(r: Recipient): RenderContext {
  return {
    owner: r.owner,
    pet: r.pet,
    category: r.category,
  }
}

/** Synthetic demo context used by the template editor live preview. */
export const DEMO_CONTEXT: RenderContext = {
  owner: 'María',
  pet: 'Rocky',
  category: 'Vacuna',
}