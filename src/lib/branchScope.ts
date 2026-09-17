/**
 * Branch (sede) scoping for history and dashboard views. Pure: no stores,
 * no storage. Security stays at the Supabase RLS boundary — this is a UI
 * presentation filter.
 */
import type { CampaignRecord } from './types'

/**
 * Keep only campaigns belonging to one sede. `branchId` null means "no
 * scoping" (whole clinic / single-user local mode). Matching prefers the
 * stable `branch_id` stored on each campaign; the label match only serves
 * legacy records saved before ids were stored — so renaming a branch never
 * detaches its history.
 */
export function filterByBranchScope(
  records: CampaignRecord[],
  branchId: number | null,
  branchName: string | null,
): CampaignRecord[] {
  if (branchId == null) return records
  return records.filter((r) => {
    if (r.branchId != null) return r.branchId === branchId
    if (branchName != null) return (r.branch ?? '') === branchName
    return false
  })
}
