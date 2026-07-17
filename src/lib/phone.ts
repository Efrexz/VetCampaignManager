/**
 * Phone normalization for the VetCampaignManager MVP.
 *
 * The VetPraxis TELÉFONOS field can contain multiple numbers with annotations,
 * separated by ' - '. Examples (real, observed):
 *   "+51 - 983211121"
 *   "+51 - 985963259(DUEÑA) - 977324052"
 *   "987654321"
 *   "+51 - 44567890"      (8-digit fixed line, NOT valid for WhatsApp Mobile)
 *
 * Strategy (confirmed with the clinic):
 *   1. Split by ' - '.
 *   2. For each part, strip parenthetical annotations ((DUEÑA), (FIJO), ...).
 *   3. Strip spaces, dashes, dots.
 *   4. Strip a leading "+51" or "51" country prefix if glued to the number.
 *   5. Consider as a candidate only Peru mobile numbers: 9 digits, first digit '9'.
 *      Fixed lines (8 digits) and other formats are skipped.
 *   6. Take the FIRST valid mobile in order of appearance.
 *   7. Return normalized as "+51" + 9 digits (E.164-like).
 *
 * Notes on (DUEÑA): the clinic said very few clients actually use that tag, so
 * we do NOT prefer it — we strictly go by order, picking the first valid mobile.
 */

const PERU_COUNTRY = '51'
const PERU_MOBILE_LENGTH = 9
/** Peru mobile numbers start with 9. */
const PERU_MOBILE_FIRSTdigit = '9'

export interface NormalizePhoneResult {
  /** E.164-like "+51XXXXXXXXX" if a valid mobile was found. */
  normalized: string
  /** True when at least one valid Peru mobile candidate was found. */
  valid: boolean
}

/**
 * Strip parenthetical annotations from a phone fragment, e.g.
 *   "985963259(DUEÑA)" -> "985963259"
 *   "985 963 259"      -> "985 963 259" (spaces handled later)
 */
function stripAnnotations(fragment: string): string {
  return fragment.replace(/\([^)]*\)/g, '')
}

/**
 * Strip a leading country prefix (with or without +) when it is glued onto
 * the rest of the number, e.g. "+51987654321" -> "987654321".
 * If the fragment is exactly the prefix (e.g. just "51" or "+51"), return ''.
 */
function stripCountryPrefix(digits: string): string {
  if (digits.startsWith('+')) digits = digits.slice(1)
  if (digits.startsWith(PERU_COUNTRY)) {
    const rest = digits.slice(PERU_COUNTRY.length)
    if (rest.length === 0) return ''
    return rest
  }
  return digits
}

function isPeruMobile(digits: string): boolean {
  return (
    digits.length === PERU_MOBILE_LENGTH &&
    digits[0] === PERU_MOBILE_FIRSTdigit
  )
}

/**
 * Parse a raw TELÉFONOS string from VetPraxis and return the chosen number.
 * Returns normalized "+51XXXXXXXXX" and a validity flag.
 */
export function normalizePhone(raw: string): NormalizePhoneResult {
  if (!raw || !raw.trim()) {
    return { normalized: '', valid: false }
  }

  const parts = raw.split(' - ')
  for (const part of parts) {
    const cleaned = stripAnnotations(part).replace(/[\s.-]/g, '')
    if (!cleaned) continue
    const digits = stripCountryPrefix(cleaned)
    if (!digits) continue
    if (isPeruMobile(digits)) {
      return { normalized: `+${PERU_COUNTRY}${digits}`, valid: true }
    }
  }

  return { normalized: '', valid: false }
}

/**
 * Quick predicate used by callers that only need the yes/no.
 */
export function isPhoneValid(raw: string): boolean {
  return normalizePhone(raw).valid
}