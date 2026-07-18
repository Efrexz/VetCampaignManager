// Phase 3 ad-hoc verification: template resolution + sendable set building.
import {
  resolveTemplateByCategoryName,
  resolveTemplateForRecipient,
  renderMessageForRecipient,
  buildSendableRecipients,
  defaultEnabledFor,
  countByStatus,
} from '../src/lib/campaign'
import { nanoid } from 'nanoid'
import type {
  Category,
  MessageTemplate,
  Recipient,
} from '../src/lib/types'

function assert(label: string, ok: boolean, extra?: unknown) {
  if (ok) {
    console.log(`  ✓ ${label}`)
  } else {
    console.error(`  ✗ ${label}`, extra ?? '')
    process.exitCode = 1
  }
}

function makeRecipient(over: Partial<Recipient>): Recipient {
  return {
    id: nanoid(),
    rowNumber: 1,
    owner: 'OWNER',
    pet: 'PET',
    rawPhone: '+51 - 980000000',
    normalizedPhone: '+51980000000',
    category: 'Vacuna',
    phoneStatus: 'valid',
    ...over,
  } as Recipient
}

function testResolve() {
  console.log('\n— resolveTemplateByCategoryName —')
  const cats: Category[] = [
    { id: 'c1', name: 'Vacuna' },
    { id: 'c2', name: 'Antipulgas' },
  ]
  const templates: MessageTemplate[] = [
    {
      id: 't1',
      categoryId: 'c1',
      name: 'Recordatorio vacuna',
      body: 'Hola {{owner}}, {{pet}} debe su vacuna.',
      isDefault: false,
    },
    {
      id: 't2',
      categoryId: null,
      name: 'Predeterminada',
      body: 'Hola {{owner}}! Tu mascota {{pet}} te espera.',
      isDefault: true,
    },
  ]

  const vacunaTpl = resolveTemplateByCategoryName('Vacuna', cats, templates)
  assert('matches by category name', vacunaTpl?.id === 't1', vacunaTpl?.id)
  assert('case-insensitive', resolveTemplateByCategoryName('vacuna', cats, templates)?.id === 't1')
  // Plural vs singular still differ; falls back to default.
  assert('plural name → default fallback', resolveTemplateByCategoryName('Vacunas', cats, templates)?.id === 't2', 'should fall back to default')

  const unknownCat = resolveTemplateByCategoryName('Hidratacion', cats, templates)
  assert('unknown category falls back to default', unknownCat?.id === 't2', unknownCat?.id)

  const accented = resolveTemplateByCategoryName('Hidratación', cats, [
    ...templates,
    { id: 't3', categoryId: 'c3', name: 'Hidratación tpl', body: 'x', isDefault: false },
  ] as MessageTemplate[])
  // Category configured accent-stripped vs Excel with accent:
  const catsWithStrip: Category[] = [
    ...cats,
    { id: 'c3', name: 'Hidratacion' },
  ]
  const accentedMatch = resolveTemplateByCategoryName('Hidratación', catsWithStrip, [
    { id: 't3', categoryId: 'c3', name: 'Hidratación tpl', body: 'x', isDefault: false },
    { id: 't2', categoryId: null, name: 'Predet', body: 'x', isDefault: true },
  ])
  assert('accent-insensitive match (Hidratación vs Hidratacion)', accentedMatch?.id === 't3', accentedMatch?.id)

  const defaultTpl = resolveTemplateForRecipient(
    makeRecipient({ category: 'Antiasma' }),
    cats,
    templates,
  )
  assert('recipient with unknown category → default', defaultTpl?.id === 't2')

  const boundTpl = resolveTemplateForRecipient(
    makeRecipient({ category: 'Vacuna' }),
    cats,
    templates,
  )
  assert('recipient with known category → bound', boundTpl?.id === 't1')

  const emptyTemplates: MessageTemplate[] = []
  assert('no templates at all → undefined', resolveTemplateByCategoryName('Vacuna', cats, emptyTemplates) === undefined)
}

function testRender() {
  console.log('\n— renderMessageForRecipient —')
  const cats: Category[] = [{ id: 'c1', name: 'Vacuna' }]
  const templates: MessageTemplate[] = [
    {
      id: 't1',
      categoryId: 'c1',
      name: 'Recordatorio vacuna',
      body: 'Hola {{owner}}, {{pet}} debe su vacuna de {{category}}. Pronto {{foo}}',
      isDefault: false,
    },
    {
      id: 't2',
      categoryId: null,
      name: 'Predeterminada',
      body: 'Hola {{owner}} por defecto',
      isDefault: true,
    },
  ]

  const r = makeRecipient({ owner: 'María', pet: 'Rocky', category: 'Vacuna' })
  const msg = renderMessageForRecipient(r, cats, templates)
  assert('replaces known vars', msg.text.includes('María') && msg.text.includes('Rocky'), msg.text)
  assert('reports unknown {{foo}}', msg.unknown.length === 1 && msg.unknown[0] === 'foo', msg.unknown)
  assert('template is the bound one', msg.template?.id === 't1')
}

function testBuildSendable() {
  console.log('\n— buildSendableRecipients —')
  const cats: Category[] = [{ id: 'c1', name: 'Vacuna' }]
  const templates: MessageTemplate[] = [
    {
      id: 't2',
      categoryId: null,
      name: 'Predeterminada',
      body: 'Hola',
      isDefault: true,
    },
  ]

  const recipients: Recipient[] = [
    makeRecipient({ id: 'v1', phoneStatus: 'valid' }),
    makeRecipient({ id: 'v2', phoneStatus: 'valid' }),
    makeRecipient({ id: 'd1', phoneStatus: 'duplicate' }),
    makeRecipient({ id: 'i1', phoneStatus: 'invalid', normalizedPhone: undefined }),
    makeRecipient({ id: 'd2', phoneStatus: 'duplicate' }),
  ]

  // Default enables: valid → on, duplicate → off, invalid → off.
  const enabled: Record<string, boolean> = {}
  for (const r of recipients) enabled[r.id] = defaultEnabledFor(r)

  let sendable = buildSendableRecipients(recipients, cats, templates, enabled)
  assert('default to-send = valid recipients', sendable.length === 2, sendable.length)

  // Enable a duplicate by override.
  enabled['d1'] = true
  sendable = buildSendableRecipients(recipients, cats, templates, enabled)
  assert('enabled duplicate counted in to-send', sendable.length === 3, sendable.length)

  // Disable a valid by override.
  enabled['v1'] = false
  sendable = buildSendableRecipients(recipients, cats, templates, enabled)
  assert('disabled valid excluded', sendable.length === 2, sendable.length)

  // Cannot enable an invalid (store guards it, but builder also skips invalid regardless).
  enabled['i1'] = true
  sendable = buildSendableRecipients(recipients, cats, templates, enabled)
  assert('invalid never sent even when forced', sendable.length === 2, sendable.length)

  // Skip when no template resolves (simulate empty templates).
  sendable = buildSendableRecipients(recipients, [], [], enabled)
  assert('no template → empty sendable', sendable.length === 0)
}

function testCountByStatus() {
  console.log('\n— countByStatus —')
  const recipients: Recipient[] = [
    makeRecipient({ id: 'v1', phoneStatus: 'valid' }),
    makeRecipient({ id: 'v2', phoneStatus: 'valid' }),
    makeRecipient({ id: 'd1', phoneStatus: 'duplicate' }),
    makeRecipient({ id: 'i1', phoneStatus: 'invalid' }),
  ]
  const c = countByStatus(recipients)
  assert('total=4', c.total === 4)
  assert('valid=2', c.valid === 2)
  assert('duplicate=1', c.duplicate === 1)
  assert('invalid=1', c.invalid === 1)
}

async function main() {
  await testResolve()
  await testRender()
  await testBuildSendable()
  await testCountByStatus()
  console.log('\nDONE')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})