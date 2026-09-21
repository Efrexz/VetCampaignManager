/**
 * Pure campaign helpers: template resolution + message rendering.
 *
 * No React, no storage, no network. Reused by the campaign preview (Phase 3)
 * and the n8n payload builder (Phase 4).
 */
import type {
  Category,
  MessageTemplate,
  Recipient,
  RecipientGroup,
} from '@/lib/types'
import {
  contextFromRecipient,
  renderTemplate,
  type RenderContext,
  type RenderResult,
} from '@/lib/template'
import { joinPetNames } from '@/lib/grouping'

/**
 * Normalize a category-like string for tolerant matching:
 * lowercase, trim, strip accents/diacritics. Excel exports from VetPraxis
 * may carry accents ("Hidratación"); configured categories may not.
 */
export function normalizeCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Resolve the template that applies for a given category name.
 * Order: exact category match → global default → undefined.
 * Matching is case- and accent-insensitive.
 */
export function resolveTemplateByCategoryName(
  categoryName: string,
  categories: Category[],
  templates: MessageTemplate[],
): MessageTemplate | undefined {
  const target = normalizeCategoryName(categoryName)
  const cat = categories.find(
    (c) => normalizeCategoryName(c.name) === target,
  )
  if (cat) {
    const bound = templates.find((t) => t.categoryId === cat.id)
    if (bound) return bound
  }
  return templates.find((t) => t.isDefault)
}

/** Resolve the template that applies for a given recipient's category. */
export function resolveTemplateForRecipient(
  recipient: Recipient,
  categories: Category[],
  templates: MessageTemplate[],
): MessageTemplate | undefined {
  return resolveTemplateByCategoryName(
    recipient.category,
    categories,
    templates,
  )
}

export interface RecipientMessage {
  text: string
  template?: MessageTemplate
  unknown: string[]
  empty: string[]
}

/**
 * Render the final WhatsApp message for a recipient, using the template
 * that applies for their category (or the default fallback).
 */
export function renderMessageForRecipient(
  recipient: Recipient,
  categories: Category[],
  templates: MessageTemplate[],
): RecipientMessage {
  const template = resolveTemplateForRecipient(recipient, categories, templates)
  if (!template) {
    return { text: '', unknown: [], empty: [] }
  }
  const result: RenderResult = renderTemplate(
    template.body,
    contextFromRecipient(recipient),
  )
  return {
    text: result.text,
    template,
    unknown: result.unknown,
    empty: result.empty,
  }
}

/**
 * Re-contact window: a phone contacted for the SAME category within the last
 * N days is excluded by default (branch-scoped — contacts are per sede).
 * The window is clinic-configurable (`AppSettings.recontactDays`, stored on
 * the branch row in Supabase mode); this constant is only the fallback.
 */
export const RECONTACT_DAYS = 10

/** Whole days elapsed since the ISO instant, in the browser's timezone. */
export function daysSince(iso: string, now = new Date()): number | null {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return null
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000)
}

/**
 * True when this branch contacted the phone for THIS category within the
 * re-contact window. Rows recorded before migration 0007 (no per-category
 * ledger yet) fall back to the overall last-contact date — conservative:
 * better one extra block than an accidental duplicate message.
 */
export function recentlyContactedFor(
  recipient: Recipient,
  category: string,
  recontactDays: number = RECONTACT_DAYS,
  now = new Date(),
): boolean {
  const contact = recipient.contactState
  if (!contact) return false
  const withinWindow = (iso: string): boolean => {
    const d = daysSince(iso, now)
    return d !== null && d < recontactDays
  }
  const key = normalizeCategoryName(category)
  const perCategory = contact.lastContacts
  // Per-category ledger present (any entry) → trust it exclusively; an
  // entry never means "contacted for everything", only for its own category.
  if (perCategory && Object.keys(perCategory).length > 0) {
    const last = perCategory[key]
    return last ? withinWindow(last) : false
  }
  // Legacy fallback (window respected regardless of which category was sent).
  if (contact.lastContactedAt) return withinWindow(contact.lastContactedAt)
  return false
}

/**
 * Default "enabled" state per recipient:
 *   valid phones without ledger flags → on;
 *   invalid phones → off (receptionist can toggle valid ones);
 *   recently contacted by this branch (per category) → off;
 *   "NO CONTACTAR" → off, permanently.
 */
export function defaultEnabledFor(
  recipient: Recipient,
  recontactDays: number = RECONTACT_DAYS,
  now = new Date(),
): boolean {
  if (recipient.phoneStatus !== 'valid') return false
  if (recipient.contactState?.doNotContact) return false
  if (recentlyContactedFor(recipient, recipient.category, recontactDays, now)) {
    return false
  }
  return true
}

export interface SendableRecipient {
  recipient: Recipient
  message: RecipientMessage
}

/**
 * Pick a template body variant deterministically per phone: same phone always
 * gets the same variant, and a campaign spreads evenly across them. Returns
 * the main body when no variants are configured.
 */
export function pickTemplateBody(
  body: string,
  variants: string[] | undefined,
  phone: string,
): string {
  const list = (variants ?? []).filter((v) => v.trim())
  if (list.length === 0) return body
  const digits = phone.replace(/\D/g, '')
  let hash = 0
  for (const ch of digits) {
    hash = (hash * 10 + (ch.charCodeAt(0) - 48)) % 1_000_003
  }
  return list[hash % list.length]
}

/**
 * Render the message for a GROUP (phone + category) using its template.
 * {{pets}} resolves to every pet in the group; {{pet}} stays the first one.
 * A template with variants rotates bodies per phone (anti-ban variation).
 */
export function renderMessageForGroup(
  group: RecipientGroup,
  categories: Category[],
  templates: MessageTemplate[],
): RecipientMessage {
  const template = resolveTemplateByCategoryName(
    group.category,
    categories,
    templates,
  )
  if (!template) {
    return { text: '', unknown: [], empty: [] }
  }
  const first = group.recipients[0]
  const body = pickTemplateBody(
    template.body,
    template.variants,
    group.phone,
  )
  const ctx: RenderContext = {
    owner: group.owner,
    pet: group.pets[0] ?? first?.pet ?? '',
    pets: joinPetNames(group.pets),
    category: group.category,
  }
  const result: RenderResult = renderTemplate(body, ctx)
  return {
    text: result.text,
    template,
    unknown: result.unknown,
    empty: result.empty,
  }
}

/** One sendable message: a group + its rendered message. */
export interface SendableGroup {
  group: RecipientGroup
  message: RecipientMessage
}

/**
 * Build the sendable list from GROUPS, applying enable overrides (keyed by
 * recipient id, mirroring the preview toggles) and the per-category contact
 * guard.
 *
 * Override semantics: the window guard only shapes the DEFAULT state. A
 * group the receptionist explicitly re-enabled (checkbox on after it started
 * off) is sent even inside the re-contact window — matching the old
 * "force-enable" behavior. Defaults are materialized by the store at import
 * time, so `enabled[id] === true` on a default-off (blocked) group can only
 * be a manual override.
 */
export function buildSendableGroups(
  groups: RecipientGroup[],
  categories: Category[],
  templates: MessageTemplate[],
  enabled: Record<string, boolean>,
  recontactDays: number,
  now = new Date(),
): SendableGroup[] {
  const out: SendableGroup[] = []
  for (const group of groups) {
    const anyEnabled = group.recipients.some(
      (r) => enabled[r.id] ?? defaultEnabledFor(r, recontactDays, now),
    )
    if (!anyEnabled) continue
    // Guard only blocks groups left on their default-off state.
    const manuallyEnabled = group.recipients.some(
      (r) => enabled[r.id] === true,
    )
    if (
      !manuallyEnabled &&
      recentlyContactedFor(
        group.recipients[0],
        group.category,
        recontactDays,
        now,
      )
    ) {
      continue
    }
    const message = renderMessageForGroup(group, categories, templates)
    if (!message.template) continue
    out.push({ group, message })
  }
  return out
}

// ── n8n payload contract ──────────────────────────────────────────────────────

/**
 * An image attached to a template, as sent to n8n → Evolution API
 * `sendMedia`. The `data` is a data URI (base64) so no public hosting is
 * needed; n8n passes it through as the `media` field.
 */
export interface N8nMediaItem {
  data: string
  mimetype: string
  fileName: string
}

/**
 * The payload posted to the n8n webhook. Versioned via `schema` so the n8n
 * workflow can route on schema in the future without breaking older flows.
 *
 * Each recipient carries the fully-rendered message so n8n / Evolution API
 * just forwards it. The per-recipient `id` lets future delivery reports join
 * back to a Supabase `deliveries` table.
 *
 * Media is deduplicated: images live once in the campaign-level `media` map
 * (keyed by template id); recipients reference them via `mediaKey`. Absent
 * when no recipient's template has an attached image.
 */
export interface N8nCampaignPayload {
  schema: string
  campaign: {
    id: string
    sentAt: string
    source: string
    /** Open slot for future fields (branchId, scheduledFor, …) without breaking. */
    [key: string]: unknown
  }
  media?: Record<string, N8nMediaItem>
  recipients: Array<{
    id: string
    owner: string
    pet: string
    phone: string
    category: string
    message: string
    /** Key into `media` when this recipient's template has an attached image. */
    mediaKey?: string
  }>
}

export interface BuildPayloadOptions {
  /** Bumped per-call id for the campaign (caller passes nanoid or similar). */
  campaignId: string
  /** ISO timestamp; defaults to now when omitted. */
  sentAt?: string
  /** Source label; defaults to the app constant. */
  source?: string
  /** Schema label; defaults to the app constant. */
  schema?: string
}

/**
 * Build the n8n webhook payload from sendable GROUPS (phone + category).
 * Wire contract unchanged: n8n/Evolution cannot tell the difference. The
 * group id is the per-recipient id; `pet` carries the joined pet names
 * ("Roco y Maxi") since that is what the message names.
 */
export function buildGroupPayload(
  sendable: SendableGroup[],
  opts: BuildPayloadOptions,
): N8nCampaignPayload {
  const media: Record<string, N8nMediaItem> = {}
  for (const { message } of sendable) {
    const m = message.template?.media
    if (m && message.template && !media[message.template.id]) {
      media[message.template.id] = {
        data: m.data,
        mimetype: m.mimetype,
        fileName: m.fileName,
      }
    }
  }
  const hasMedia = Object.keys(media).length > 0

  return {
    schema: opts.schema ?? 'vetcampaign/v1',
    campaign: {
      id: opts.campaignId,
      sentAt: opts.sentAt ?? new Date().toISOString(),
      source: opts.source ?? 'VetCampaignManager',
    },
    ...(hasMedia ? { media } : {}),
    recipients: sendable.map(({ group, message }) => ({
      id: group.id,
      owner: group.owner,
      pet: joinPetNames(group.pets),
      phone: group.phone,
      category: group.category,
      message: message.text,
      ...(message.template?.media ? { mediaKey: message.template.id } : {}),
    })),
  }
}