/**
 * Supabase-backed storage. Same async signatures as the localStorage layer
 * (`storage/categories.ts`, `storage/templates.ts`, `storage/settings.ts`),
 * so feature code is identical regardless of backend.
 *
 * Tenant isolation is enforced at the database level via RLS policies
 * (see `supabase/migrations/0001_init_schema.sql`). Each query is implicitly
 * scoped to tenants the current user belongs to.
 */
import { newId } from '@/lib/id'
import { normalizeCategoryName, RECONTACT_DAYS } from '@/lib/campaign'
import { stripPayloadMedia } from '../campaigns'
import { requireSupabase } from '@/integrations/supabase'
import { useTenantStore } from '@/shared/stores/tenantStore'
import type {
  Category,
  MessageTemplate,
  CampaignDraft,
  CampaignRecord,
  ContactState,
  ContactExclusion,
  ContactFlagEntry,
} from '@/lib/types'

export interface ContactEntry {
  phone: string
  ownerName: string
  petName: string
  /** Category that was just sent (recorded in the per-category ledger). */
  category?: string
}

export interface DeliveryEntry {
  recipientId: string
  phone: string
}

/**
 * Returns the current tenant id from the tenant store. Throws if there is no
 * active tenant — callers should ensure `hydrate()` has completed first.
 */
function tenantId(): string {
  const id = useTenantStore.getState().currentTenantId
  if (!id) {
    throw new Error('No hay tenant activo. Inicia sesión y selecciona una clínica.')
  }
  return id
}

/**
 * True when the query failed because a column does not exist yet (PostgREST
 * PGRST204 / PGRST201 / SQLSTATE 42703). Used to tolerate deploys that land
 * before migration 0007 is executed: the affected feature degrades to its
 * default instead of breaking hydration or the send flow.
 */
function isMissingColumn(
  err: { message?: string; code?: string } | null,
  column: string,
): boolean {
  if (!err) return false
  if (err.code === 'PGRST204' || err.code === 'PGRST201' || err.code === '42703') {
    return true
  }
  const msg = err.message ?? ''
  return (
    msg.includes(column) &&
    (msg.includes('does not exist') ||
      msg.includes('Could not find') ||
      msg.includes('schema cache'))
  )
}

/**
 * Returns the current branch (sede) id. Config (categories, templates,
 * webhook) is branch-scoped — callers should ensure the branch context has
 * been resolved (`tenantStore.hydrate` + `loadBranches`) first.
 */
function branchId(): number {
  const id = useTenantStore.getState().currentBranchId
  if (!id) {
    throw new Error('No hay sede activa. Inicia sesión de nuevo.')
  }
  return id
}

// ── Categories (branch-scoped: each sede manages its own) ────────────────────

export async function listCategories(): Promise<Category[]> {
  const sb = requireSupabase()
  const { data, error } = await sb
    .from('categories')
    .select('id, name')
    .eq('branch_id', branchId())
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function saveCategory(c: Category): Promise<Category> {
  const sb = requireSupabase()
  const { error } = await sb
    .from('categories')
    .upsert({ id: c.id, tenant_id: tenantId(), branch_id: branchId(), name: c.name })
    .select('id, name')
    .single()
  if (error) throw error
  return c
}

export async function deleteCategory(id: string): Promise<void> {
  const sb = requireSupabase()
  const { error } = await sb.from('categories').delete().eq('id', id)
  if (error) throw error
}

export async function findCategoryByName(
  name: string,
): Promise<Category | undefined> {
  const sb = requireSupabase()
  const { data, error } = await sb
    .from('categories')
    .select('id, name')
    .eq('branch_id', branchId())
    .ilike('name', name.trim())
    .maybeSingle()
  if (error) throw error
  return data ?? undefined
}

export function makeCategory(name: string): Category {
  return { id: newId(), name: name.trim() }
}

// ── Templates (branch-scoped) ────────────────────────────────────────────────

export async function listTemplates(): Promise<MessageTemplate[]> {
  const sb = requireSupabase()
  const { data, error } = await sb
    .from('message_templates')
    .select('id, category_id, name, body, is_default, media')
    .eq('branch_id', branchId())
    .order('is_default', { ascending: false })
    .order('name')
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    body: row.body,
    isDefault: row.is_default,
    media: row.media ?? null,
  }))
}

export async function saveTemplate(t: MessageTemplate): Promise<MessageTemplate> {
  const sb = requireSupabase()
  const bid = branchId()

  // If this template is the new default, clear the default flag on any other
  // template of the SAME branch first to respect the one-default-per-branch
  // invariant (migration 0003).
  if (t.isDefault) {
    const { error: clearErr } = await sb
      .from('message_templates')
      .update({ is_default: false })
      .eq('branch_id', bid)
      .neq('id', t.id)
    if (clearErr) throw clearErr
  }

  const { error } = await sb
    .from('message_templates')
    .upsert({
      id: t.id,
      tenant_id: tenantId(),
      branch_id: bid,
      category_id: t.categoryId,
      name: t.name,
      body: t.body,
      is_default: t.isDefault,
      media: t.media ?? null,
    })
    .select('id, category_id, name, body, is_default')
    .single()
  if (error) throw error
  return t
}

export async function deleteTemplate(id: string): Promise<void> {
  const sb = requireSupabase()
  const { error } = await sb.from('message_templates').delete().eq('id', id)
  if (error) throw error
}

/**
 * Reassign every template bound to the given categoryId to the default
 * (categoryId = null). Returns the ids of the templates that were reassigned.
 */
export async function reassignTemplatesFromCategory(
  categoryId: string,
): Promise<string[]> {
  const sb = requireSupabase()

  // Find affected templates first so we can return their ids.
  const { data: affected, error: selErr } = await sb
    .from('message_templates')
    .select('id')
    .eq('branch_id', branchId())
    .eq('category_id', categoryId)
  if (selErr) throw selErr

  const ids = (affected ?? []).map((r) => r.id)
  if (ids.length === 0) return []

  const { error } = await sb
    .from('message_templates')
    .update({ category_id: null })
    .in('id', ids)
  if (error) throw error
  return ids
}

export async function getTemplateForCategory(
  categoryId: string,
): Promise<MessageTemplate | undefined> {
  const sb = requireSupabase()
  const { data, error } = await sb
    .from('message_templates')
    .select('id, category_id, name, body, is_default, media')
    .eq('branch_id', branchId())
    .eq('category_id', categoryId)
    .maybeSingle()
  if (error) throw error
  if (!data) return undefined
  return {
    id: data.id,
    categoryId: data.category_id,
    name: data.name,
    body: data.body,
    isDefault: data.is_default,
    media: data.media ?? null,
  }
}

export async function getDefaultTemplate(): Promise<MessageTemplate | undefined> {
  const sb = requireSupabase()
  const { data, error } = await sb
    .from('message_templates')
    .select('id, category_id, name, body, is_default, media')
    .eq('branch_id', branchId())
    .eq('is_default', true)
    .maybeSingle()
  if (error) throw error
  if (!data) return undefined
  return {
    id: data.id,
    categoryId: data.category_id,
    name: data.name,
    body: data.body,
    isDefault: data.is_default,
    media: data.media ?? null,
  }
}

export function makeTemplate(input: {
  categoryId: string | null
  name: string
  body: string
  isDefault: boolean
}): MessageTemplate {
  return { id: newId(), ...input }
}

// ── Settings (webhook URL + HMAC secret live on the BRANCH — migration 0003) ─

export interface ClinicSettings {
  webhookUrl: string
  hmacSecret: string
  /** Current branch name, so the UI can label what it is configuring. */
  branchName: string
  /** Re-contact window in days (clinic-wide; stored on the branch row). */
  recontactDays: number
}

export async function getSettings(): Promise<ClinicSettings> {
  const sb = requireSupabase()
  const { data, error } = await sb
    .from('branches')
    .select('webhook_url, hmac_secret, name, recontact_days')
    .eq('id', branchId())
    .maybeSingle()
  // Migration 0007 not applied yet → fall back to the legacy select so the
  // app still boots (the window simply stays at its default until 0007 runs).
  if (error && isMissingColumn(error, 'recontact_days')) {
    console.warn(
      'branches.recontact_days missing — run supabase/migrations/0007. Using default window.',
    )
    const legacy = await sb
      .from('branches')
      .select('webhook_url, hmac_secret, name')
      .eq('id', branchId())
      .maybeSingle()
    if (legacy.error) throw legacy.error
    return {
      webhookUrl: legacy.data?.webhook_url ?? '',
      hmacSecret: legacy.data?.hmac_secret ?? '',
      branchName: legacy.data?.name ?? '',
      recontactDays: RECONTACT_DAYS,
    }
  }
  if (error) throw error
  if (!data) {
    return {
      webhookUrl: '',
      hmacSecret: '',
      branchName: '',
      recontactDays: RECONTACT_DAYS,
    }
  }
  return {
    webhookUrl: data.webhook_url,
    hmacSecret: data.hmac_secret,
    branchName: data.name,
    recontactDays:
      typeof data.recontact_days === 'number' && data.recontact_days > 0
        ? data.recontact_days
        : RECONTACT_DAYS,
  }
}

export async function saveSettings(s: ClinicSettings): Promise<ClinicSettings> {
  const sb = requireSupabase()
  const update = {
    webhook_url: s.webhookUrl,
    hmac_secret: s.hmacSecret,
    recontact_days: s.recontactDays,
    // Renaming the sede from Settings is allowed (owner/admin only by RLS).
    ...(s.branchName.trim() ? { name: s.branchName.trim() } : {}),
  }
  let { error } = await sb
    .from('branches')
    .update(update)
    .eq('id', branchId())
  // Column not migrated yet: persist the rest, skip the window silently.
  if (error && isMissingColumn(error, 'recontact_days')) {
    console.warn('branches.recontact_days missing — skipping window save.')
    const legacy = {
      webhook_url: s.webhookUrl,
      hmac_secret: s.hmacSecret,
      ...(s.branchName.trim() ? { name: s.branchName.trim() } : {}),
    }
    ;({ error } = await sb.from('branches').update(legacy).eq('id', branchId()))
  }
  if (error) throw error
  return s
}

// ── Seed (no-op in Supabase mode — handled by SQL migrations + manual invites)

export async function seedIfEmpty(): Promise<void> {
  // In Supabase mode, seeding is done via SQL migrations. A new tenant gets
  // its clinic_settings row automatically via trigger, but categories and
  // templates are added by the user (or seeded by running `0002_seed_demo.sql`).
  // The auth hook calls `tenantStore.hydrate()` which loads real data.
  return
}

// ── Contacts (branch-scoped ledger — migration 0005) ─────────────────────────

export async function findContactStates(
  phones: string[],
): Promise<Map<string, ContactState>> {
  if (phones.length === 0) return new Map()
  const sb = requireSupabase()

  // First attempt: full ledger (0007 + 0008 columns). Degrades twice:
  //   - no `note` (0008 missing) → retry without it, notes are cosmetic.
  //   - no `last_contacts` (0007 missing) → legacy select, conservative guard.
  let data:
    | Array<{
        phone: string
        last_contacted_at: string | null
        last_contacts: unknown
        do_not_contact: boolean
        note: string | null
      }>
    | null
  const withNote = await sb
    .from('contacts')
    .select('phone, last_contacted_at, last_contacts, do_not_contact, note')
    .eq('branch_id', branchId())
    .in('phone', phones)
  let noteAvailable = true
  if (withNote.error && isMissingColumn(withNote.error, 'note')) {
    console.warn('contacts.note missing — run supabase/migrations/0008. Notes hidden.')
    noteAvailable = false
    const withoutNote = await sb
      .from('contacts')
      .select('phone, last_contacted_at, last_contacts, do_not_contact')
      .eq('branch_id', branchId())
      .in('phone', phones)
    if (withoutNote.error && isMissingColumn(withoutNote.error, 'last_contacts')) {
      console.warn(
        'contacts.last_contacts missing — run supabase/migrations/0007. Falling back to legacy ledger.',
      )
      const legacy = await sb
        .from('contacts')
        .select('phone, last_contacted_at, do_not_contact')
        .eq('branch_id', branchId())
        .in('phone', phones)
      if (legacy.error) throw legacy.error
      const states = new Map<string, ContactState>()
      for (const row of legacy.data ?? []) {
        states.set(row.phone, {
          lastContactedAt: row.last_contacted_at ?? undefined,
          doNotContact: row.do_not_contact,
        })
      }
      return states
    }
    if (withoutNote.error) throw withoutNote.error
    data = (withoutNote.data ?? []).map((row) => ({
      ...row,
      note: null as string | null,
    }))
  } else if (withNote.error) {
    throw withNote.error
  } else {
    data = withNote.data
  }

  const states = new Map<string, ContactState>()
  for (const row of data ?? []) {
    states.set(row.phone, {
      lastContactedAt: row.last_contacted_at ?? undefined,
      lastContacts:
        (row.last_contacts as Record<string, string> | null) ?? undefined,
      doNotContact: row.do_not_contact,
      ...(row.do_not_contact && noteAvailable
        ? { note: row.note ?? undefined }
        : {}),
    })
  }
  return states
}

export async function markContacted(entries: ContactEntry[]): Promise<void> {
  if (entries.length === 0) return
  const sb = requireSupabase()
  const bid = branchId()
  const tid = tenantId()
  const now = new Date().toISOString()
  const phones = entries.map((e) => e.phone)

  // Two-step instead of upsert: an upsert would overwrite the primary key
  // (nanoid) on every send, breaking future joins (replies, contact history).
  // Select what exists → update those, insert the rest with fresh ids.
  // Migration 0007 not applied → the editor degrades to the legacy ledger
  // (last_contacted_at only) instead of failing the whole send flow.
  const existingRow = await sb
    .from('contacts')
    .select('id, phone, last_contacts')
    .eq('branch_id', bid)
    .in('phone', phones)
  let legacyLedger = false
  let existingRows: Array<{ id: string; phone: string; last_contacts: unknown }>
  if (existingRow.error && isMissingColumn(existingRow.error, 'last_contacts')) {
    console.warn('contacts.last_contacts missing — legacy ledger write.')
    legacyLedger = true
    const legacy = await sb
      .from('contacts')
      .select('id, phone')
      .eq('branch_id', bid)
      .in('phone', phones)
    if (legacy.error) throw legacy.error
    existingRows = (legacy.data ?? []).map((r) => ({
      id: r.id as string,
      phone: r.phone as string,
      last_contacts: undefined as unknown,
    }))
  } else if (existingRow.error) {
    throw existingRow.error
  } else {
    existingRows = existingRow.data ?? []
  }

  const existingByPhone = new Map(
    existingRows.map((r) => [
      r.phone,
      {
        id: r.id,
        lastContacts: legacyLedger
          ? {}
          : ((r.last_contacts as Record<string, string> | null) ?? {}),
      },
    ]),
  )

  const toInsert = entries
    .filter((e) => !existingByPhone.has(e.phone))
    .map((e) => ({
      id: newId(),
      tenant_id: tid,
      branch_id: bid,
      phone: e.phone,
      owner_name: e.ownerName,
      pet_name: e.petName,
      last_contacted_at: now,
      ...(legacyLedger
        ? {}
        : {
            last_contacts: e.category
              ? { [normalizeCategoryName(e.category)]: now }
              : {},
          }),
    }))
  if (toInsert.length > 0) {
    let { error: insErr } = await sb.from('contacts').insert(toInsert)
    if (insErr && isMissingColumn(insErr, 'last_contacts')) {
      legacyLedger = true
      const stripped: Array<Record<string, unknown>> = toInsert.map((row) => {
        const rest = { ...row } as Record<string, unknown>
        delete rest.last_contacts
        return rest
      })
      ;({ error: insErr } = await sb.from('contacts').insert(stripped))
    }
    if (insErr) throw insErr
  }

  const toUpdate = entries.filter((e) => existingByPhone.has(e.phone))
  for (const e of toUpdate) {
    // Per-row update: keeps owner/pet names fresh, stamps the contact time,
    // and records the per-category ledger entry (migration 0007).
    const prev = existingByPhone.get(e.phone)
    const update = {
      owner_name: e.ownerName,
      pet_name: e.petName,
      last_contacted_at: now,
      ...(legacyLedger
        ? {}
        : {
            last_contacts: {
              ...(prev?.lastContacts ?? {}),
              ...(e.category
                ? { [normalizeCategoryName(e.category)]: now }
                : {}),
            },
          }),
    }
    const { error: updErr } = await sb
      .from('contacts')
      .update(update)
      .eq('id', prev?.id)
    if (updErr) throw updErr
  }
}

/**
 * Toggle the per-phone "NO CONTACTAR" flag (exclusion list). Upserts the
 * contact row when it does not exist yet; same two-step insert/update
 * pattern as `markContacted`. The optional `note` column (migration 0008)
 * degrades gracefully when it has not been applied yet.
 */
export async function setContactFlags(
  entries: ContactFlagEntry[],
): Promise<void> {
  if (entries.length === 0) return
  const sb = requireSupabase()
  const bid = branchId()
  const tid = tenantId()
  const phones = entries.map((e) => e.phone)

  const existingRow = await sb
    .from('contacts')
    .select('id, phone')
    .eq('branch_id', bid)
    .in('phone', phones)
  if (existingRow.error) throw existingRow.error

  const existing = new Map(
    (existingRow.data ?? []).map((r) => [r.phone, r.id as string]),
  )

  const toInsert = entries
    .filter((e) => !existing.has(e.phone))
    .map((e) => ({
      id: newId(),
      tenant_id: tid,
      branch_id: bid,
      phone: e.phone,
      owner_name: e.ownerName?.trim() ?? '',
      pet_name: e.petName?.trim() ?? '',
      do_not_contact: e.doNotContact,
      last_contacted_at: null,
      last_contacts: {},
      ...(e.note?.trim() ? { note: e.note.trim() } : {}),
    }))
  if (toInsert.length > 0) {
    let { error: insErr } = await sb.from('contacts').insert(toInsert)
    if (insErr && isMissingColumn(insErr, 'note')) {
      console.warn('contacts.note missing — run migration 0008. Saving without note.')
      const stripped: Array<Record<string, unknown>> = toInsert.map((row) => {
        const rest = { ...row } as Record<string, unknown>
        delete rest.note
        return rest
      })
      ;({ error: insErr } = await sb.from('contacts').insert(stripped))
    }
    if (insErr) throw insErr
  }

  const toUpdate = entries.filter((e) => existing.has(e.phone))
  for (const e of toUpdate) {
    const payload: Record<string, unknown> = {
      do_not_contact: e.doNotContact,
      note: e.doNotContact ? e.note?.trim() || null : null,
    }
    if (e.ownerName?.trim()) payload.owner_name = e.ownerName.trim()
    if (e.petName?.trim()) payload.pet_name = e.petName.trim()
    let { error: updErr } = await sb
      .from('contacts')
      .update(payload)
      .eq('id', existing.get(e.phone))
    if (updErr && isMissingColumn(updErr, 'note')) {
      console.warn('contacts.note missing — updating without note.')
      delete payload.note
      ;({ error: updErr } = await sb
        .from('contacts')
        .update(payload)
        .eq('id', existing.get(e.phone)))
    }
    if (updErr) throw updErr
  }
}

/** Exclusion-list rows for the Settings tab, sorted by phone. */
export async function listContactExclusions(): Promise<ContactExclusion[]> {
  const sb = requireSupabase()
  const first = await sb
    .from('contacts')
    .select('phone, owner_name, pet_name, note, do_not_contact')
    .eq('branch_id', branchId())
    .eq('do_not_contact', true)
    .order('phone')
  let rows =
    first.data as Array<{
      phone: string
      owner_name: string
      pet_name: string
      note: string | null
      do_not_contact: boolean
    }> | null
  if (first.error && isMissingColumn(first.error, 'note')) {
    console.warn('contacts.note missing — listing without notes.')
    const legacy = await sb
      .from('contacts')
      .select('phone, owner_name, pet_name, do_not_contact')
      .eq('branch_id', branchId())
      .eq('do_not_contact', true)
      .order('phone')
    if (legacy.error) throw legacy.error
    rows = (legacy.data ?? []).map((row) => ({
      ...row,
      note: null as string | null,
    }))
  } else if (first.error) {
    throw first.error
  }
  return (rows ?? []).map((row) => ({
    phone: row.phone,
    ownerName: row.owner_name,
    petName: row.pet_name,
    note: row.note ?? undefined,
  }))
}

// ── Campaign deliveries (one row per attempted message) ─────────────────────
/** Insert the initial 'queued' rows for a dispatched campaign. */
export async function recordDeliveries(
  campaignId: string,
  entries: DeliveryEntry[],
): Promise<void> {
  if (entries.length === 0) return
  const sb = requireSupabase()
  const { error } = await sb.from('campaign_deliveries').insert(
    entries.map((e) => ({
      campaign_id: campaignId,
      recipient_id: e.recipientId,
      tenant_id: tenantId(),
      branch_id: branchId(),
      phone: e.phone,
      status: 'queued' as const,
    })),
  )
  if (error) throw error
}

// ── Campaigns (historical record of each send) ──────────────────────────────
// Shape lives in `lib/types.ts` (CampaignRecord). Branch attribution comes
// from the current branch context (each campaign belongs to a sede).

export async function recordCampaign(record: CampaignDraft): Promise<void> {
  const sb = requireSupabase()
  const { error } = await sb.from('campaigns').insert({
    id: record.id,
    tenant_id: tenantId(),
    branch_id: branchId(),
    sent_by: record.sentBy,
    total_recipients: record.totalRecipients,
    enabled_recipients: record.enabledRecipients,
    invalid_recipients: record.invalidRecipients,
    duplicate_recipients: record.duplicateRecipients,
    excluded_recipients: record.excludedRecipients ?? 0,
    mock: record.mock ?? false,
    source_file: record.sourceFile ?? null,
    // Quota: store the payload WITHOUT image base64 (images live on
    // templates, one copy per template — see localStorage `recordCampaign`).
    payload: stripPayloadMedia(record.payload),
    status: record.status,
    error_message: record.errorMessage,
  })
  if (error) throw error
}

export async function listCampaigns(limit = 50): Promise<CampaignRecord[]> {
  const sb = requireSupabase()
  const { data, error } = await sb
    .from('campaigns')
    .select(
      'id, sent_by, total_recipients, enabled_recipients, invalid_recipients, duplicate_recipients, excluded_recipients, mock, source_file, payload, status, error_message, created_at, branch_id, branch:branches(name)',
    )
    .eq('tenant_id', tenantId())
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((row) => {
    // PostgREST embed for a many-to-one may be typed as object or array
    // depending on the client version — normalize both.
    const branchEmbed = row.branch as
      | { name?: string }
      | { name?: string }[]
      | null
    const branchName = Array.isArray(branchEmbed)
      ? branchEmbed[0]?.name
      : branchEmbed?.name
    return {
      id: row.id,
      sentBy: row.sent_by,
      totalRecipients: row.total_recipients,
      enabledRecipients: row.enabled_recipients,
      invalidRecipients: row.invalid_recipients,
      duplicateRecipients: row.duplicate_recipients,
      excludedRecipients: row.excluded_recipients,
      mock: row.mock,
      sourceFile: row.source_file ?? undefined,
      branch: branchName ?? undefined,
      branchId: typeof row.branch_id === 'number' ? row.branch_id : undefined,
      payload: row.payload,
      status: row.status,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    }
  })
}

// ── Audit log ────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: number
  userId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  metadata: unknown
  createdAt: string
}

export async function recordAudit(entry: {
  userId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  metadata: unknown
}): Promise<void> {
  const sb = requireSupabase()
  const { error } = await sb.from('audit_log').insert({
    tenant_id: tenantId(),
    user_id: entry.userId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    metadata: entry.metadata,
  })
  if (error) throw error
}

export async function listAudit(limit = 100): Promise<AuditEntry[]> {
  const sb = requireSupabase()
  const { data, error } = await sb
    .from('audit_log')
    .select('id, user_id, action, entity_type, entity_id, metadata, created_at')
    .eq('tenant_id', tenantId())
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  }))
}