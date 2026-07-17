/**
 * Domain types shared across the campaign lifecycle.
 * Pure data: no React, no storage, no network.
 */

export type PhoneStatus = 'valid' | 'invalid' | 'duplicate'

export interface Recipient {
  /** Stable client-side id (nanoid) — Supabase-row-compatible later. */
  id: string
  /** 1-based row number within the source sheet (for error reporting). */
  rowNumber: number
  owner: string
  /** Pet name with trailing '#' artifact stripped. */
  pet: string
  /** Raw phone field from the Excel (may contain several numbers + annotations). */
  rawPhone: string
  /** E.164-like normalized phone of the chosen number, if any valid found. */
  normalizedPhone?: string
  category: string
  phoneStatus: PhoneStatus
  /** Short reason when invalid/duplicate, omit when valid. */
  issue?: string
}

export interface ImportError {
  /** 1-based row number when the error is row-specific. */
  row?: number
  /** Column header name when the error is column-specific. */
  field?: string
  message: string
}

export interface CategoryCount {
  name: string
  count: number
}

export interface ImportResult {
  recipients: Recipient[]
  /** Workbook/structure-level errors (sheet not found, required column missing). */
  errors: ImportError[]
  totals: {
    totalRows: number
    valid: number
    invalid: number
    duplicate: number
  }
  detectedCategories: CategoryCount[]
}