/**
 * In-memory campaign session state. NOT persisted: per the agreed MVP plan,
 * refreshing the page means the receptionist re-imports the Excel file.
 *
 * Durable data (categories, templates, webhook URL) lives in storage/ (Phase 2),
 * not here.
 */
import { create } from 'zustand'
import type { ImportResult } from '@/lib/types'

export type CampaignPhase = 'import' | 'preview' | 'send'

interface CampaignState {
  phase: CampaignPhase
  rawFileName: string | null
  result: ImportResult | null
  /** Recipients explicitly excluded by the receptionist in the preview (Phase 3). */
  excludedIds: Set<string>

  setParsedResult: (fileName: string, result: ImportResult) => void
  setPhase: (phase: CampaignPhase) => void
  exclude: (id: string) => void
  include: (id: string) => void
  reset: () => void
}

const initialState = {
  phase: 'import' as CampaignPhase,
  rawFileName: null,
  result: null,
  excludedIds: new Set<string>(),
}

export const useCampaignStore = create<CampaignState>((set) => ({
  ...initialState,

  setParsedResult: (fileName, result) =>
    set({ rawFileName: fileName, result }),

  setPhase: (phase) => set({ phase }),

  exclude: (id) =>
    set((s) => {
      const next = new Set(s.excludedIds)
      next.add(id)
      return { excludedIds: next }
    }),

  include: (id) =>
    set((s) => {
      const next = new Set(s.excludedIds)
      next.delete(id)
      return { excludedIds: next }
    }),

  reset: () =>
    set({
      ...initialState,
      excludedIds: new Set<string>(),
    }),
}))

/** Convenience selector for "is there a current campaign in memory". */
export function hasCampaign(s: CampaignState): boolean {
  return s.result !== null && s.result.recipients.length > 0
}