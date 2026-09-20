import { beforeEach, describe, expect, test } from 'vitest'
import {
  findContactStates,
  listContactExclusions,
  markContacted,
  setContactFlags,
} from '../contacts'

beforeEach(() => {
  localStorage.clear()
})

describe('contact ledger (localStorage)', () => {
  test('unknown phones → empty map', async () => {
    const states = await findContactStates(['+51987654321'])
    expect(states.size).toBe(0)
  })

  test('markContacted records last_contacted_at, idempotent per phone', async () => {
    await markContacted([
      { phone: '+51987654321', ownerName: 'María', petName: 'Rocko' },
    ])
    let states = await findContactStates(['+51987654321'])
    const first = states.get('+51987654321')
    expect(first?.lastContactedAt).toBeTruthy()
    expect(first?.doNotContact).toBe(false)

    // Second send to the same phone: still ONE record, refreshed timestamp.
    await markContacted([
      { phone: '+51987654321', ownerName: 'María', petName: 'Rocko' },
    ])
    states = await findContactStates(['+51987654321'])
    const second = states.get('+51987654321')
    expect(second?.lastContactedAt).toBeTruthy()
    expect(
      new Date(second?.lastContactedAt ?? 0).getTime(),
    ).toBeGreaterThanOrEqual(new Date(first?.lastContactedAt ?? 0).getTime())
  })

  test('blank names do not overwrite existing ones', async () => {
    await markContacted([
      { phone: '+51987654321', ownerName: 'María', petName: 'Rocko' },
    ])
    await markContacted([{ phone: '+51987654321', ownerName: '', petName: '' }])
    const raw = localStorage.getItem('vcm:contacts:v1')
    expect(raw).toContain('María')
  })
})

describe('exclusion list (NO CONTACTAR flags)', () => {
  test('flagging creates the ledger row and the guard sees it', async () => {
    await setContactFlags([
      {
        phone: '+51917777777',
        ownerName: 'Problemático',
        note: 'Molesto',
        doNotContact: true,
      },
    ])
    const states = await findContactStates(['+51917777777'])
    expect(states.get('+51917777777')?.doNotContact).toBe(true)

    const exclusions = await listContactExclusions()
    expect(exclusions).toEqual([
      {
        phone: '+51917777777',
        ownerName: 'Problemático',
        petName: '',
        note: 'Molesto',
      },
    ])
  })

  test('multi-phone client → one flag per phone, same note', async () => {
    const note = 'Pidió que no escribamos'
    await setContactFlags([
      { phone: '+51911111111', note, doNotContact: true },
      { phone: '+51922222222', note, doNotContact: true },
      { phone: '+51933333333', note, doNotContact: true },
    ])
    for (const phone of ['+51911111111', '+51922222222', '+51933333333']) {
      expect((await findContactStates([phone])).get(phone)?.doNotContact).toBe(
        true,
      )
    }
    expect(await listContactExclusions()).toHaveLength(3)
  })

  test('unflagging clears the exclusion and the note', async () => {
    await setContactFlags([
      { phone: '+51917777777', note: 'Molesto', doNotContact: true },
    ])
    await setContactFlags([{ phone: '+51917777777', doNotContact: false }])
    expect(await listContactExclusions()).toEqual([])
    const states = await findContactStates(['+51917777777'])
    expect(states.get('+51917777777')?.doNotContact).toBe(false)
  })

  test('exclusion survives a later real dispatch (flag not reset)', async () => {
    await setContactFlags([
      { phone: '+51917777777', note: 'Molesto', doNotContact: true },
    ])
    await markContacted([
      { phone: '+51917777777', ownerName: 'X', petName: 'Y' },
    ])
    const states = await findContactStates(['+51917777777'])
    expect(states.get('+51917777777')?.doNotContact).toBe(true)
    expect(await listContactExclusions()).toHaveLength(1)
  })
})
