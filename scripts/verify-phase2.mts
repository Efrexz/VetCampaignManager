// Phase 2 ad-hoc verification: template engine, seed defaults, and the
// exactly-one-default invariant. Run via esbuild (see AGENTS.md).
import {
  renderTemplate,
  extractVariables,
  VARIABLES,
  DEMO_CONTEXT,
} from '../src/lib/template'
import { setJSON } from '../src/storage/storage'
import { KEYS } from '../src/storage/keys'
import { listCategories, listTemplates } from '../src/storage/exports'
import { saveTemplate, makeTemplate } from '../src/storage/templates'
import { seedIfEmpty } from '../src/storage/seed'
import { newId } from '../src/lib/id'

function assert(label: string, ok: boolean, extra?: unknown) {
  if (ok) {
    console.log(`  ✓ ${label}`)
  } else {
    console.error(`  ✗ ${label}`, extra ?? '')
    process.exitCode = 1
  }
}

// Minimal localStorage shim for Node.
const store = new Map<string, string>()
const globalRef = globalThis as unknown as {
  localStorage: {
    getItem(k: string): string | null
    setItem(k: string, v: string): void
    removeItem(k: string): void
  }
}
globalRef.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => {
    store.set(k, v)
  },
  removeItem: (k) => store.delete(k),
}

async function testRender() {
  console.log('\n— renderTemplate —')
  const r = renderTemplate(
    'Hola {{owner}} 👋\nNos encantaría ver a {{pet}} 🐾\nRecordatorio: {{category}}.',
    DEMO_CONTEXT,
  )
  assert(
    'replaces all known vars',
    r.text ===
      'Hola María 👋\nNos encantaría ver a Rocky 🐾\nRecordatorio: Vacuna.' &&
      r.unknown.length === 0,
    r.text,
  )
  assert('used list', JSON.stringify(r.used.sort()) === '["category","owner","pet"]')

  const r2 = renderTemplate('Hola {{foo}} y {{owner}} maltido', DEMO_CONTEXT)
  assert('reports unknown var foo', r2.unknown.length === 1 && r2.unknown[0] === 'foo', r2.unknown)
  assert('keeps unknown inline', r2.text.includes('{{foo}}'))

  const r3 = renderTemplate('Hola {{       owner     }}! Tu {{pet}} te espera.', { ...DEMO_CONTEXT, pet: '', category: 'Vacuna' })
  assert('tolerates inner whitespace', r3.text === 'Hola María! Tu  te espera.', r3.text)
  assert('reports empty var pet (when referenced)', r3.empty.length === 1 && r3.empty[0] === 'pet', r3.empty)

  const r4 = renderTemplate('no vars here', DEMO_CONTEXT)
  assert('no vars returns used empty', r4.used.length === 0 && r4.unknown.length === 0)

  assert(
    'extractVariables lists keys',
    JSON.stringify(extractVariables('{{a}} {{b}} {{a}}').sort()) === '["a","b"]',
  )

  assert('registry has exactly 3 vars', VARIABLES.length === 3, VARIABLES.length)
}

async function testSeed() {
  console.log('\n— seedIfEmpty —')
  store.clear()

  await seedIfEmpty()
  const cats = await listCategories()
  const templates = await listTemplates()
  assert('seeds 3 categories', cats.length === 3, cats.length)
  assert(
    'seeded categories: Vacuna, Antipulgas, Hidratación',
    ['Vacuna', 'Antipulgas', 'Hidratación'].every((n) =>
      cats.some((c) => c.name === n),
    ),
    cats.map((c) => c.name),
  )
  assert('seeds exactly 1 default template', templates.length === 1, templates)
  assert('seed default has isDefault=true', templates[0].isDefault === true)
  assert('seed default categoryId null', templates[0].categoryId === null)

  // Re-run should be idempotent.
  await seedIfEmpty()
  const cats2 = await listCategories()
  const templates2 = await listTemplates()
  assert('seed idempotent on categories', cats2.length === 3)
  assert('seed idempotent on templates', templates2.length === 1)
}

async function testOneDefaultInvariant() {
  console.log('\n— exactly-one-default invariant —')
  store.clear()
  await seedIfEmpty()

  const cats = await listCategories()
  const vacuna = cats.find((c) => c.name === 'Vacuna')!

  // Save a category-bound template and mark it default → unmark the existing default.
  const bound = makeTemplate({
    categoryId: vacuna.id,
    name: 'Recordatorio vacuna',
    body: 'Hola {{owner}}, {{pet}} debe su vacuna.',
    isDefault: true,
  })
  await saveTemplate(bound)

  const templates = await listTemplates()
  const defaults = templates.filter((t) => t.isDefault)
  assert('exactly one default remains', defaults.length === 1, defaults.length)
  assert('the newest is now default', defaults[0].id === bound.id)
  const oldDefault = templates.find((t) => t.name === 'Predeterminada')!
  assert('old default lost its flag', oldDefault.isDefault === false)
}

async function testEmptyStorageDefaults() {
  console.log('\n— empty storage returns fallback shapes —')
  store.clear()
  const cats = await listCategories()
  const tpls = await listTemplates()
  assert('empty cats is []', Array.isArray(cats) && cats.length === 0)
  assert('empty templates is []', Array.isArray(tpls) && tpls.length === 0)
}

async function testMalformedEnvelope() {
  console.log('\n— malformed envelope returns fallback —')
  // Simulate a corrupted envelope (missing 'data' field).
  store.set(KEYS.categories, JSON.stringify({ version: 1 }))
  const cats = await listCategories()
  assert('corrupted cats falls back to []', Array.isArray(cats) && cats.length === 0)

  // Bad JSON entirely.
  store.set(KEYS.categories, '<<<not json>>>')
  const cats2 = await listCategories()
  assert('garbage cats falls back to []', Array.isArray(cats2) && cats2.length === 0)
}

async function main() {
  await testRender()
  await testSeed()
  await testOneDefaultInvariant()
  await testEmptyStorageDefaults()
  await testMalformedEnvelope()
  console.log('\nDONE')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})