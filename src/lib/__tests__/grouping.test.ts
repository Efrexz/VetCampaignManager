import { describe, expect, test } from 'vitest'
import { groupRecipients, joinPetNames } from '../grouping'
import type { Recipient } from '../types'

let seq = 0
const mk = (over: Partial<Recipient> = {}): Recipient => ({
  id: `r${++seq}`,
  rowNumber: seq + 1,
  owner: 'María',
  pet: 'Rocky',
  rawPhone: '+51 - 980000000',
  normalizedPhone: '+51980000000',
  category: 'Baño',
  phoneStatus: 'valid',
  ...over,
})

describe('groupRecipients', () => {
  test('two pets, same category, same phone → ONE group with both pets', () => {
    const out = groupRecipients([
      mk({ pet: 'Roco' }),
      mk({ pet: 'Maxi' }),
    ])
    expect(out.groups).toHaveLength(1)
    expect(out.groups[0].pets).toEqual(['Roco', 'Maxi'])
    expect(out.groups[0].recipients).toHaveLength(2)
    expect(out.exactDuplicateRows).toBe(0)
    expect(out.deferredRows).toBe(0)
  })

  test('same phone, different categories → one group per category', () => {
    const out = groupRecipients([
      mk({ pet: 'Roco', category: 'Baño' }),
      mk({ pet: 'Maxi', category: 'Baño' }),
      mk({ pet: 'Firulais', category: 'Vacuna' }),
    ])
    expect(out.groups.map((g) => g.category).sort()).toEqual([
      'Baño',
      'Vacuna',
    ])
    const bano = out.groups.find((g) => g.category === 'Baño')!
    expect(bano.pets).toEqual(['Roco', 'Maxi'])
    const vacuna = out.groups.find((g) => g.category === 'Vacuna')!
    expect(vacuna.pets).toEqual(['Firulais'])
  })

  test('same pet with two services → first service wins, second deferred', () => {
    const out = groupRecipients([
      mk({ pet: 'Roco', category: 'Desparasitación' }),
      mk({ pet: 'Roco', category: 'Antipulgas' }),
    ])
    expect(out.groups).toHaveLength(1)
    expect(out.groups[0].category).toBe('Desparasitación')
    expect(out.deferredRows).toBe(1)
  })

  test('exact duplicate row (phone+pet+category) is silently discarded', () => {
    const out = groupRecipients([
      mk({ pet: 'Roco', category: 'Baño' }),
      mk({ pet: 'Roco', category: 'Baño', owner: 'Otro' }),
    ])
    expect(out.groups).toHaveLength(1)
    expect(out.groups[0].recipients).toHaveLength(1)
    expect(out.exactDuplicateRows).toBe(1)
    expect(out.deferredRows).toBe(0)
  })

  test('case/accent-insensitive category matching folds groups together', () => {
    const out = groupRecipients([
      mk({ pet: 'Roco', category: 'Hidratación' }),
      mk({ pet: 'Maxi', category: 'HIDRATACION' }),
    ])
    expect(out.groups).toHaveLength(1)
    expect(out.groups[0].pets).toEqual(['Roco', 'Maxi'])
  })

  test('same pet name under different phones is NOT deferred', () => {
    const out = groupRecipients([
      mk({ pet: 'Roco', normalizedPhone: '+51980000000' }),
      mk({ pet: 'Roco', normalizedPhone: '+51981111111' }),
    ])
    expect(out.groups).toHaveLength(2)
    expect(out.deferredRows).toBe(0)
  })

  test('invalid rows never join a group', () => {
    const out = groupRecipients([
      mk({ phoneStatus: 'invalid', normalizedPhone: undefined }),
      mk({ pet: 'Roco' }),
    ])
    expect(out.groups).toHaveLength(1)
    expect(out.groups[0].recipients).toHaveLength(1)
  })

  test('stable order: groups appear in file order', () => {
    const out = groupRecipients([
      mk({ pet: 'A', category: 'Vacuna', normalizedPhone: '+51981111111' }),
      mk({ pet: 'B', category: 'Baño' }),
    ])
    expect(out.groups.map((g) => g.category)).toEqual(['Vacuna', 'Baño'])
  })
})

describe('joinPetNames', () => {
  test('spanish natural join', () => {
    expect(joinPetNames([])).toBe('')
    expect(joinPetNames(['Roco'])).toBe('Roco')
    expect(joinPetNames(['Roco', 'Maxi'])).toBe('Roco y Maxi')
    expect(joinPetNames(['Roco', 'Maxi', 'Firulais'])).toBe(
      'Roco, Maxi y Firulais',
    )
  })
})
