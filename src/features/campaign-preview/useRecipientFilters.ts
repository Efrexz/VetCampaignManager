import { useMemo, useState } from 'react'
import type { Recipient } from '@/lib/types'

export type StatusFilter = 'all' | 'valid' | 'invalid' | 'duplicate'

export interface FilterState {
  search: string
  category: string // '' = all
  status: StatusFilter
}

export function useRecipientFilters<T extends Recipient>(recipients: T[]) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const filtered = useMemo<T[]>(() => {
    const q = search.trim().toLowerCase()
    return recipients.filter((r) => {
      if (status !== 'all' && r.phoneStatus !== status) return false
      if (category && r.category !== category) return false
      if (q) {
        const haystack = [
          r.owner,
          r.pet,
          r.rawPhone,
          r.normalizedPhone ?? '',
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    }) as T[]
  }, [recipients, search, category, status])

  const reset = () => {
    setSearch('')
    setCategory('')
    setStatus('all')
  }

  const isActive =
    search.trim() !== '' || category !== '' || status !== 'all'

  return {
    state: { search, category, status },
    setSearch,
    setCategory,
    setStatus,
    filtered,
    reset,
    isActive,
  }
}