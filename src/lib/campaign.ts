/**
 * Pure campaign helpers: template resolution + message rendering.
 *
 * No React, no storage, no network. Reused by the campaign preview (Phase 3)
 * and the n8n payload builder (Phase 4).
 */
import type { Category, MessageTemplate, Recipient } from '@/lib/types'
import {
  contextFromRecipient,
  renderTemplate,
  type RenderResult,
} from '@/lib/template'

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
 * Default "enabled" state per recipient. Valid phones default to on;
 * duplicates and invalid phones default to off. The receptionist can toggle
 * each row in the preview. (Pure helper; the store persists the overrides.)
 */
export function defaultEnabledFor(recipient: Recipient): boolean {
  return recipient.phoneStatus === 'valid'
}

export interface SendableRecipient {
  recipient: Recipient
  message: RecipientMessage
}

/**
 * Build the final list of recipients to actually send to, given the user's
 * enable/disable overrides. Used by the send screen (Phase 4) and the
 * preview's "to send" count.
 */
export function buildSendableRecipients(
  recipients: Recipient[],
  categories: Category[],
  templates: MessageTemplate[],
  enabled: Record<string, boolean>,
): SendableRecipient[] {
  const out: SendableRecipient[] = []
  for (const r of recipients) {
    const isOn = enabled[r.id] ?? defaultEnabledFor(r)
    if (!isOn) continue
    if (r.phoneStatus === 'invalid') continue
    const message = renderMessageForRecipient(r, categories, templates)
    if (!message.template) continue
    out.push({ recipient: r, message })
  }
  return out
}

/** Count by status (used by the preview header chips). */
export function countByStatus(recipients: Recipient[]): {
  total: number
  valid: number
  invalid: number
  duplicate: number
} {
  return {
    total: recipients.length,
    valid: recipients.filter((r) => r.phoneStatus === 'valid').length,
    invalid: recipients.filter((r) => r.phoneStatus === 'invalid').length,
    duplicate: recipients.filter((r) => r.phoneStatus === 'duplicate').length,
  }
}