import { useSettingsStore } from '@/shared/stores/settingsStore'
import {
  AlertTriangle,
  Ban,
  Image as ImageIcon,
  Info,
  MessageSquare,
  Star,
  Tag,
  X,
} from 'lucide-react'
import { Card, Chip, EmptyState, MessagePreview } from '@/shared/components/ui'
import { daysSince, normalizeCategoryName, renderMessageForGroup } from '@/lib/campaign'
import { joinPetNames } from '@/lib/grouping'
import type { ContactState, RecipientGroup } from '@/lib/types'

interface Props {
  group: RecipientGroup | null
  onClose: () => void
}

export function MessagePreviewPanel({ group, onClose }: Props) {
  const categories = useSettingsStore((s) => s.categories)
  const templates = useSettingsStore((s) => s.templates)

  if (!group) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={<MessageSquare size={22} />}
          title="Selecciona un mensaje"
          description="Haz clic en una fila para ver cómo recibirá su mensaje de WhatsApp (con todas sus mascotas si aplica)."
        />
      </Card>
    )
  }

  const msg = renderMessageForGroup(group, categories, templates)
  const templateName = msg.template?.name
  const isDefault = msg.template?.isDefault ?? false
  const boundCategoryName =
    msg.template && msg.template.categoryId
      ? categories.find((c) => c.id === msg.template!.categoryId)?.name
      : null
  const contact = group.recipients[0]?.contactState

  return (
    <Card className="sticky top-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-mist">
        <div className="min-w-0">
          <p className="text-2xs uppercase tracking-wide text-ink-mute">
            Vista previa
          </p>
          <h3 className="text-md font-semibold text-ink truncate">
            {group.owner}
          </h3>
          <p className="text-xs text-ink-mute mt-0.5 font-mono">
            {group.phone}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-sm p-1 text-ink-mute hover:bg-mist-soft hover:text-ink transition-colors"
          title="Cerrar"
        >
          <X size={14} />
        </button>
      </div>

      {/* Pets + category line */}
      <div className="px-4 py-2.5 flex flex-wrap items-center gap-1.5 text-sm bg-mist-soft/30 border-b border-mist">
        <Tag size={12} className="text-ink-mute shrink-0" />
        <span className="text-ink-soft">Mascotas:</span>
        <span className="font-medium text-ink">{joinPetNames(group.pets) || '—'}</span>
        <Chip tone="neutral">{group.category}</Chip>
        {group.pets.length > 1 && (
          <Chip tone="vegetal">{group.pets.length} mascotas</Chip>
        )}
      </div>

      {/* Template info as a clean pill row */}
      <div className="px-4 py-3 border-b border-mist space-y-1.5">
        {msg.template ? (
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="text-2xs uppercase tracking-wide text-ink-mute">
              Plantilla
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-mist bg-mist-soft px-2 py-0.5 text-2xs text-ink">
              <span className="font-medium truncate max-w-40">{templateName}</span>
              {isDefault && (
                <span className="inline-flex items-center gap-0.5 text-clay">
                  <Star size={10} />
                </span>
              )}
            </span>
            {boundCategoryName && (
              <span className="text-2xs text-ink-mute">para {boundCategoryName}</span>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2 text-sm text-warn">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              Esta categoría no tiene mensaje todavía. Crea uno en{' '}
              <strong>Ajustes → Plantillas</strong> antes de enviar.
            </span>
          </div>
        )}

        {msg.template?.media && (
          <div className="flex items-center gap-2 text-sm">
            <ImageIcon size={14} className="text-vegetal" />
            <span className="text-ink-soft">
              Se enviará con imagen:{' '}
              <span className="font-medium text-ink truncate">
                {msg.template.media.fileName}
              </span>
            </span>
          </div>
        )}

        {msg.unknown.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-danger">
            <AlertTriangle size={12} />
            Estos códigos del mensaje no se reconocen:
            <code className="font-mono">
              {msg.unknown.map((v) => `{{${v}}}`).join(', ')}
            </code>
          </div>
        )}

        {msg.empty.length > 0 && msg.text && (
          <div className="flex items-center gap-2 text-xs text-warn">
            <AlertTriangle size={12} />
            A este cliente le falta:{' '}
            {msg.empty.map((v) => `{{${v}}}`).join(', ')}
          </div>
        )}
      </div>

      {/* Folded rows note: second services are visible but never re-sent */}
      {group.notes.length > 0 && (
        <div className="px-4 py-3 border-b border-mist bg-warn-soft/30 space-y-1">
          <p className="text-xs font-medium text-warn flex items-center gap-1.5">
            <Info size={12} />
            No se envían otros mensajes (evita repeticiones):
          </p>
          <ul className="text-2xs text-ink-soft list-disc pl-4 space-y-0.5">
            {group.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Last contact, always visible (no hover needed) */}
      {contact && (contact.lastContactedAt || contact.lastContacts) && (
        <div className="px-4 py-2.5 border-b border-mist text-xs text-ink-soft flex items-center gap-1.5">
          <Info size={12} className="text-ink-mute shrink-0" />
          <span>
            Último envío a este teléfono:{' '}
            {lastContactDescription(contact, group.category)}
          </span>
        </div>
      )}

      {/* Exclusion banner: this client will never be messaged */}
      {contact?.doNotContact && (
        <div className="px-4 py-2.5 border-b border-mist bg-danger-soft/40 flex items-start gap-2 text-xs text-danger">
          <Ban size={12} className="shrink-0 mt-0.5" />
          <span>
            <strong>Cliente vetado en esta sede</strong>
            {contact.note ? ` — ${contact.note}` : ''}. No recibirá mensajes
            aunque cargue el Excel; quítalo en Ajustes → Clientes excluidos si
            fue un error.
          </span>
        </div>
      )}

      {/* WhatsApp bubble preview on a dotted chat surface */}
      <div className="p-4 bg-dots">
        <MessagePreview
          recipientName={group.owner}
          message={msg.text}
          caption={false}
          mediaUrl={msg.template?.media?.data ?? null}
        />
      </div>
    </Card>
  )
}

function lastContactDescription(
  contact: ContactState,
  category: string,
): string {
  const hasPerCat =
    !!contact.lastContacts && Object.keys(contact.lastContacts).length > 0
  if (hasPerCat && contact.lastContacts) {
    const thisCat =
      contact.lastContacts[normalizeCategoryName(category)]
    if (thisCat) return `${category} — ${fmtDays(thisCat)} por este servicio`
    const [cat, iso] = Object.entries(contact.lastContacts).sort((a, b) =>
      b[1].localeCompare(a[1]),
    )[0]
    return `${cat} — ${fmtDays(iso)}`
  }
  return contact.lastContactedAt ? `${fmtDays(contact.lastContactedAt)} (el archivo anterior)` : '—'
}

function fmtDays(iso: string): string {
  const d = daysSince(iso)
  if (d === null) return iso
  if (d === 0) return 'hoy'
  if (d === 1) return 'ayer'
  return `hace ${d} día(s)`
}
