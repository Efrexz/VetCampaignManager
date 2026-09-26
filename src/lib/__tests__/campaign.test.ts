import { describe, expect, test } from 'vitest'
import {
  buildGroupPayload,
  buildSendableGroups,
  daysSince,
  defaultEnabledFor,
  normalizeCategoryName,
  pickTemplateBody,
  recentlyContactedFor,
  renderMessageForGroup,
  resolveTemplateByCategoryName,
  templateModelIndex,
} from '../campaign'
import { groupRecipients } from '../grouping'
import type {
  Category,
  MessageTemplate,
  Recipient,
} from '../types'

const mkRecipient = (over: Partial<Recipient> = {}): Recipient => ({
  id: 'r1',
  rowNumber: 2,
  owner: 'María',
  pet: 'Rocky',
  rawPhone: '+51 - 980000000',
  normalizedPhone: '+51980000000',
  category: 'Vacuna',
  phoneStatus: 'valid',
  ...over,
})

const cats: Category[] = [
  { id: 'c1', name: 'Vacuna' },
  { id: 'c2', name: 'Hidratación' },
]

const templates: MessageTemplate[] = [
  {
    id: 't-vac',
    categoryId: 'c1',
    name: 'Vacuna',
    body: 'Hola {{owner}}, cita de {{category}} para {{pet}}',
    isDefault: false,
  },
  {
    id: 't-hid',
    categoryId: 'c2',
    name: 'Hidratación',
    body: 'Hola {{owner}}, hidrata a {{pet}}',
    isDefault: false,
  },
  {
    id: 't-def',
    categoryId: null,
    name: 'Predeterminada',
    body: 'Hola {{owner}} por defecto',
    isDefault: true,
  },
]

describe('normalizeCategoryName', () => {
  test('lowercases, trims and strips accents', () => {
    expect(normalizeCategoryName('  Hidratación ')).toBe('hidratacion')
    expect(normalizeCategoryName('VACUNA')).toBe('vacuna')
  })
})

describe('pickTemplateBody (anti-ban variants)', () => {
  const variants = ['VARIANTE A', 'VARIANTE B', 'VARIANTE C']

  test('no variants → main body', () => {
    expect(pickTemplateBody('PRINCIPAL', undefined, '+51980000000')).toBe(
      'PRINCIPAL',
    )
    expect(pickTemplateBody('PRINCIPAL', [], '+51980000000')).toBe('PRINCIPAL')
    expect(pickTemplateBody('PRINCIPAL', ['  ', ''], '+51980000000')).toBe(
      'PRINCIPAL',
    )
  })

  test('same phone always resolves to the same body', () => {
    const a = pickTemplateBody('P', variants, '+51980000000')
    const b = pickTemplateBody('P', variants, '+51980000000')
    expect(a).toBe(b)
    expect(['P', ...variants]).toContain(a)
  })

  test('main body participates in the rotation (never starves)', () => {
    const used = new Set(
      Array.from({ length: 24 }, (_, i) =>
        pickTemplateBody('P', ['VAR B'], `+51980000${String(i).padStart(3, '0')}`),
      ),
    )
    // With 1 variant there are 2 rotating bodies; both must appear.
    expect(used.size).toBe(2)
    expect(used.has('P')).toBe(true)
    expect(used.has('VAR B')).toBe(true)
  })

  test('index matches the picked body (A/B/C labeling)', () => {
    const phones = Array.from(
      { length: 12 },
      (_, i) => `+51980000${String(i).padStart(3, '0')}`,
    )
    for (const phone of phones) {
      const idx = templateModelIndex('P', variants, phone)
      expect(pickTemplateBody('P', variants, phone)).toBe(
        ['P', ...variants][idx],
      )
    }
  })
})

describe('resolveTemplateByCategoryName', () => {
  test('prefers an exact category match over the global default', () => {
    const t = resolveTemplateByCategoryName('Vacuna', cats, templates)
    expect(t?.id).toBe('t-vac')
  })

  test('matches categories tolerantly (case + accents)', () => {
    expect(resolveTemplateByCategoryName('vacuna', cats, templates)?.id).toBe(
      't-vac',
    )
    expect(
      resolveTemplateByCategoryName('HIDRATACIÓN', cats, templates)?.id,
    ).toBe('t-hid')
  })

  test('falls back to the global default when no category match exists', () => {
    const t = resolveTemplateByCategoryName('Desparasitación', cats, templates)
    expect(t?.id).toBe('t-def')
  })

  test('returns undefined when there is no default and no match', () => {
    const t = resolveTemplateByCategoryName(
      'Desparasitación',
      cats,
      templates.filter((x) => !x.isDefault),
    )
    expect(t).toBeUndefined()
  })
})

describe('buildSendableGroups', () => {
  test('keeps only enabled groups and renders the resolved template', () => {
    const groups = groupRecipients([
      mkRecipient({ id: '1', category: 'Vacuna' }),
      mkRecipient({
        id: '2',
        normalizedPhone: '+51981111111',
        category: 'HIDRATACIÓN',
      }),
      mkRecipient({ id: '4', pet: 'Maxi' }),
    ]).groups
    const enabled = { '1': true, '2': true, '4': false }
    const out = buildSendableGroups(groups, cats, templates, enabled, 10, NOW)
    expect(out.map((s) => s.group.id)).toEqual([
      '+51980000000|vacuna',
      '+51981111111|hidratacion',
    ])
    expect(out[0].message.text).toBe('Hola María, cita de Vacuna para Rocky')
  })

  test('multi-pet group renders {{pets}} naming every pet', () => {
    const templatesPets: MessageTemplate[] = [
      {
        id: 't-bano',
        categoryId: null,
        name: 'Baño todas',
        body: 'Hola {{owner}}, {{pets}} esperan {{category}}',
        isDefault: true,
      },
    ]
    const group = groupRecipients([
      mkRecipient({ id: '1', pet: 'Roco', category: 'Baño' }),
      mkRecipient({ id: '2', pet: 'Maxi', category: 'Baño' }),
    ]).groups
    const msg = renderMessageForGroup(group[0], cats, templatesPets)
    expect(msg.text).toBe('Hola María, Roco y Maxi esperan Baño')
  })

  test('excludes a group whose category was contacted inside the window', () => {
    const at = new Date(NOW.getTime() - 2 * 86_400_000).toISOString()
    const group = groupRecipients([
      mkRecipient({
        id: '1',
        contactState: { lastContacts: { vacuna: at }, doNotContact: false },
      }),
    ]).groups
    const out = buildSendableGroups(group, cats, templates, {}, 10, NOW)
    expect(out).toHaveLength(0)
  })

  test('a manually re-enabled blocked group IS sent (force-enable)', () => {
    const at = new Date(NOW.getTime() - 2 * 86_400_000).toISOString()
    const group = groupRecipients([
      mkRecipient({
        id: '1',
        contactState: { lastContacts: { vacuna: at }, doNotContact: false },
      }),
    ]).groups
    const out = buildSendableGroups(group, cats, templates, { '1': true }, 10, NOW)
    expect(out).toHaveLength(1)
  })

  test('other category with recent contact does NOT block this group', () => {
    const at = new Date(NOW.getTime() - 2 * 86_400_000).toISOString()
    const group = groupRecipients([
      mkRecipient({
        id: '1',
        category: 'Baño',
        contactState: { lastContacts: { promociones: at }, doNotContact: false },
      }),
    ]).groups
    const out = buildSendableGroups(group, cats, templates, {}, 10, NOW)
    expect(out).toHaveLength(1)
  })

  test('defaults an un-toggled group to enabled iff valid + not contacted', () => {
    const group = groupRecipients([mkRecipient({ id: '1' })]).groups
    const out = buildSendableGroups(group, cats, templates, {}, 10, NOW)
    expect(out).toHaveLength(1)
  })
})

describe('buildGroupPayload', () => {
  test('maps sendable groups to payload recipients with rendered messages', () => {
    const group = groupRecipients([
      mkRecipient({ id: '1', owner: 'María', pet: 'Rocky' }),
    ]).groups
    const out = buildGroupPayload(
      group.map((g) => ({
        group: g,
        message: renderMessageForGroup(g, cats, templates),
      })),
      { campaignId: 'C', sentAt: '2026-01-01T00:00:00.000Z' },
    )
    expect(out.campaign.id).toBe('C')
    expect(out.recipients[0]).toMatchObject({
      id: '+51980000000|vacuna',
      owner: 'María',
      pet: 'Rocky',
      phone: '+51980000000',
      category: 'Vacuna',
      message: 'Hola María, cita de Vacuna para Rocky',
    })
  })

  test('multi-pet group carries the joined pet names', () => {
    const group = groupRecipients([
      mkRecipient({ pet: 'Roco' }),
      mkRecipient({ pet: 'Maxi' }),
    ]).groups
    const out = buildGroupPayload(
      group.map((g) => ({
        group: g,
        message: renderMessageForGroup(g, cats, templates),
      })),
      { campaignId: 'C' },
    )
    expect(out.recipients[0].pet).toBe('Roco y Maxi')
  })

  test('omits media when no template carries an image', () => {
    const group = groupRecipients([mkRecipient()]).groups
    const out = buildGroupPayload(
      group.map((g) => ({
        group: g,
        message: renderMessageForGroup(g, cats, templates),
      })),
      { campaignId: 'C' },
    )
    expect(out.media).toBeUndefined()
    expect(out.recipients[0].mediaKey).toBeUndefined()
  })

  test('includes campaign-level media map and per-recipient mediaKey', () => {
    const withImage = templates.map((t) =>
      t.id === 't-vac'
        ? {
            ...t,
            media: {
              data: 'data:image/jpeg;base64,QUJD',
              mimetype: 'image/jpeg',
              fileName: 'vacuna.jpg',
              bytes: 3,
            },
          }
        : t,
    )
    const group = groupRecipients([mkRecipient()]).groups
    const out = buildGroupPayload(
      group.map((g) => ({
        group: g,
        message: renderMessageForGroup(g, cats, withImage),
      })),
      { campaignId: 'C' },
    )

    expect(out.media).toEqual({
      't-vac': {
        data: 'data:image/jpeg;base64,QUJD',
        mimetype: 'image/jpeg',
        fileName: 'vacuna.jpg',
      },
    })
    expect(out.recipients[0].mediaKey).toBe('t-vac')
  })

  test('grouping produces stable counts to feed the header chips', () => {
    const out = groupRecipients([
      mkRecipient({ id: '1', pet: 'Rocko', category: 'Vacuna' }),
      mkRecipient({ id: '2', pet: 'Maxi', category: 'Vacuna' }),
      mkRecipient({
        id: '3',
        phoneStatus: 'invalid',
        normalizedPhone: undefined,
      }),
    ])
    expect(out.groups).toHaveLength(1)
    expect(out.exactDuplicateRows).toBe(0)
    expect(out.deferredRows).toBe(0)
  })
})

// ── Contact ledger guard (S2) ─────────────────────────────────────────────────

// Fixed "now" so day math is deterministic.
const NOW = new Date('2026-09-12T12:00:00.000Z')

describe('daysSince', () => {
  test('whole days elapsed', () => {
    expect(daysSince('2026-09-12T06:00:00.000Z', NOW)).toBe(0) // same day
    expect(daysSince('2026-09-05T12:00:00.000Z', NOW)).toBe(7)
    expect(daysSince('2026-09-01T12:00:00.000Z', NOW)).toBe(11)
  })

  test('invalid date → null', () => {
    expect(daysSince('not-a-date', NOW)).toBeNull()
  })
})

describe('recentlyContactedFor (per-category guard)', () => {
  test('same category within the window → blocked', () => {
    const at = new Date(NOW.getTime() - 2 * 86_400_000).toISOString()
    expect(
      recentlyContactedFor(
        mkRecipient({
          contactState: {
            lastContacts: { vacuna: at },
            doNotContact: false,
          },
        }),
        'Vacuna',
        10,
        NOW,
      ),
    ).toBe(true)
  })

  test('different category within the window → NOT blocked', () => {
    const at = new Date(NOW.getTime() - 2 * 86_400_000).toISOString()
    expect(
      recentlyContactedFor(
        mkRecipient({
          contactState: { lastContacts: { promociones: at }, doNotContact: false },
        }),
        'Vacuna',
        10,
        NOW,
      ),
    ).toBe(false)
  })

  test('category matching is normalized (case + accents)', () => {
    const at = new Date(NOW.getTime() - 2 * 86_400_000).toISOString()
    expect(
      recentlyContactedFor(
        mkRecipient({
          contactState: { lastContacts: { bano: at }, doNotContact: false },
        }),
        'BAÑO',
        10,
        NOW,
      ),
    ).toBe(true)
  })

  test('outside the window → not blocked', () => {
    const at = new Date(NOW.getTime() - 15 * 86_400_000).toISOString()
    expect(
      recentlyContactedFor(
        mkRecipient({
          contactState: { lastContacts: { vacuna: at }, doNotContact: false },
        }),
        'Vacuna',
        10,
        NOW,
      ),
    ).toBe(false)
  })

  test('no ledger state → not contacted', () => {
    expect(
      recentlyContactedFor(mkRecipient(), 'Vacuna', 10, NOW),
    ).toBe(false)
  })

  test('legacy row (lastContactedAt only) stays conservative', () => {
    const at = new Date(NOW.getTime() - 2 * 86_400_000).toISOString()
    expect(
      recentlyContactedFor(
        mkRecipient({ contactState: { lastContactedAt: at, doNotContact: false } }),
        'Baño',
        10,
        NOW,
      ),
    ).toBe(true)
  })
})

describe('defaultEnabledFor with the contact ledger', () => {
  test('valid without ledger state → enabled', () => {
    expect(defaultEnabledFor(mkRecipient(), 10, NOW)).toBe(true)
  })

  test('invalid → disabled', () => {
    expect(
      defaultEnabledFor(mkRecipient({ phoneStatus: 'invalid' }), 10, NOW),
    ).toBe(false)
  })

  test('recently contacted for the same category → disabled by default', () => {
    const at = new Date(NOW.getTime() - 2 * 86_400_000).toISOString()
    expect(
      defaultEnabledFor(
        mkRecipient({
          contactState: { lastContacts: { vacuna: at }, doNotContact: false },
        }),
        10,
        NOW,
      ),
    ).toBe(false)
  })

  test('contacted for another category → Enabled', () => {
    const at = new Date(NOW.getTime() - 2 * 86_400_000).toISOString()
    expect(
      defaultEnabledFor(
        mkRecipient({
          category: 'Baño',
          contactState: { lastContacts: { vacuna: at }, doNotContact: false },
        }),
        10,
        NOW,
      ),
    ).toBe(true)
  })

  test('contacted long ago → enabled again', () => {
    const at = new Date(NOW.getTime() - 30 * 86_400_000).toISOString()
    expect(
      defaultEnabledFor(
        mkRecipient({ contactState: { lastContactedAt: at, doNotContact: false } }),
        10,
        NOW,
      ),
    ).toBe(true)
  })

  test('blocked by a configurable window (15 days)', () => {
    const at = new Date(NOW.getTime() - 12 * 86_400_000).toISOString()
    expect(
      recentlyContactedFor(
        mkRecipient({ contactState: { lastContactedAt: at, doNotContact: false } }),
        'Vacuna',
        15,
        NOW,
      ),
    ).toBe(true)
    expect(
      recentlyContactedFor(
        mkRecipient({ contactState: { lastContactedAt: at, doNotContact: false } }),
        'Vacuna',
        10,
        NOW,
      ),
    ).toBe(false)
  })

  test('NO CONTACTAR → disabled even when contacted long ago', () => {
    const at = new Date(NOW.getTime() - 30 * 86_400_000).toISOString()
    expect(
      defaultEnabledFor(
        mkRecipient({ contactState: { lastContactedAt: at, doNotContact: true } }),
        10,
        NOW,
      ),
    ).toBe(false)
  })
})
