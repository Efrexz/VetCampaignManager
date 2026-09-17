import { describe, expect, test } from 'vitest'
import { filterByBranchScope } from '../branchScope'
import type { CampaignRecord } from '../types'

function record(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    id: 'r1',
    sentBy: '',
    totalRecipients: 10,
    enabledRecipients: 8,
    invalidRecipients: 0,
    duplicateRecipients: 0,
    payload: {},
    status: 'sent',
    errorMessage: null,
    createdAt: '2026-09-10T12:00:00.000Z',
    ...overrides,
  }
}

describe('filterByBranchScope', () => {
  test('null scope (owner / local mode) returns everything', () => {
    const recs = [
      record({ id: 'a', branchId: 1 }),
      record({ id: 'b' }),
    ]
    expect(filterByBranchScope(recs, null, null)).toEqual(recs)
  })

  test('matches by branch id for new records', () => {
    const recs = [
      record({ id: 'mine', branchId: 2 }),
      record({ id: 'other', branchId: 3 }),
    ]
    expect(filterByBranchScope(recs, 2, 'Los Olivos').map((r) => r.id)).toEqual(['mine'])
  })

  test('legacy records (no id) still match by label', () => {
    const recs = [
      record({ id: 'legacy', branch: 'San Miguel' }),
      record({ id: 'legacyOther', branch: 'Los Olivos' }),
      record({ id: 'renamed', branchId: 3, branch: 'Otra cosa' }), // renamed sede keeps id match
    ]
    expect(filterByBranchScope(recs, 2, 'San Miguel').map((r) => r.id)).toEqual([
      'legacy',
    ])
  })

  test('legacy records cannot match when the branch name is unknown', () => {
    const recs = [record({ id: 'legacy', branch: 'X' })]
    expect(filterByBranchScope(recs, 2, null)).toEqual([])
  })
})
