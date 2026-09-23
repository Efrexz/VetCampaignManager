import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  Send,
  Tag,
  Users,
} from 'lucide-react'
import { Button, Card, KpiCard, Modal } from '@/shared/components/ui'
import { useCampaignStore } from '@/shared/stores/campaignStore'
import { useSettingsStore } from '@/shared/stores/settingsStore'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  buildGroupPayload,
  buildSendableGroups,
  type N8nCampaignPayload,
} from '@/lib/campaign'
import { groupRecipients, joinPetNames } from '@/lib/grouping'
import { newId } from '@/lib/id'
import { maskUrl } from '@/lib/format'
import { sendCampaign } from '@/integrations/n8n'
import {
  recordCampaign,
  recordAudit,
  markContacted,
  recordDeliveries,
  type ContactEntry,
  type DeliveryEntry,
} from '@/storage/exports'

type SendStatus = 'idle' | 'sending' | 'success' | 'error'

/** Above this message count, warn about WhatsApp ban risk (anti-ban). */
const SEND_BATCH_WARN = 50

export function SendCampaign() {
  const navigate = useNavigate()
  const result = useCampaignStore((s) => s.result)
  const recipientEnabled = useCampaignStore((s) => s.recipientEnabled)
  const fileName = useCampaignStore((s) => s.rawFileName)
  const setPhase = useCampaignStore((s) => s.setPhase)
  const resetStore = useCampaignStore((s) => s.reset)

  const categories = useSettingsStore((s) => s.categories)
  const templates = useSettingsStore((s) => s.templates)
  const settings = useSettingsStore((s) => s.settings)
  const auth = useAuth()

  const [status, setStatus] = useState<SendStatus>('idle')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [payload, setPayload] = useState<N8nCampaignPayload | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  /** Timestamp captured at the moment the webhook replied OK. */
  const [sentAt, setSentAt] = useState<Date | null>(null)
  /** True when the send was a demo (mock webhook) — honest success text. */
  const [mockSend, setMockSend] = useState(false)

  // Build the sendable groups + payload up front (memoized).
  const grouped = useMemo(
    () => (result ? groupRecipients(result.recipients) : null),
    [result],
  )
  const sendableGroups = useMemo(() => {
    if (!grouped) return []
    return buildSendableGroups(
      grouped.groups,
      categories,
      templates,
      recipientEnabled,
      settings.recontactDays,
    )
  }, [grouped, categories, templates, recipientEnabled, settings.recontactDays])

  // Build a preview payload (never sent if user cancels).
  const previewPayload = useMemo<N8nCampaignPayload | null>(() => {
    if (sendableGroups.length === 0) return null
    return buildGroupPayload(sendableGroups, {
      campaignId: newId(),
      schema: 'vetcampaign/v1',
      source: 'VetCampaignManager',
    })
  }, [sendableGroups])

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const { group } of sendableGroups) {
      m.set(group.category, (m.get(group.category) ?? 0) + 1)
    }
    return [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [sendableGroups])

  const missingTemplates = useMemo(
    () => sendableGroups.some(({ message }) => !message.template),
    [sendableGroups],
  )

  const withMediaCount = useMemo(
    () => sendableGroups.filter(({ message }) => message.template?.media).length,
    [sendableGroups],
  )

  // Guard: redirect back if no campaign or no sendable recipients.
  useEffect(() => {
    if (!result) {
      toast.info('Importa un archivo Excel primero.')
      navigate('/campaign', { replace: true })
      return
    }
    if (sendableGroups.length === 0 && status !== 'success') {
      toast.error('No hay destinatarios habilitados. Vuelve a la revisión.')
      navigate('/campaign/preview', { replace: true })
    }
  }, [result, sendableGroups.length, navigate, status])

  if (!result) return null

  const handleBack = () => {
    setPhase('preview')
    navigate('/campaign/preview')
  }

  const handleConfirm = async () => {
    if (!previewPayload || !result) return
    setConfirmOpen(false)
    setStatus('sending')
    setSendError(null)
    // Snapshot the payload that was actually dispatched.
    setPayload(previewPayload)
    const res = await sendCampaign(previewPayload, settings.webhookUrl, {
      token: settings.hmacSecret,
    })
    const totals = result.totals
    // Valid rows never actually messaged: disabled groups and services
    // folded into another message (deferred). Sent rows = recipients of
    // dispatched groups.
    const sentRows = sendableGroups.reduce(
      (n, { group }) => n + group.recipients.length,
      0,
    )
    const excludedCount = Math.max(0, totals.valid - sentRows)

    // Audit entry is independent — fire and forget.
    void recordAudit({
      userId: auth.userId,
      action: 'campaign.send',
      entityType: 'campaign',
      entityId: previewPayload.campaign.id,
      metadata: {
        recipientCount: sendableGroups.length,
        mock: res.mock,
        ok: res.ok,
        status: res.status,
      },
    })

    // Persistence, SEQUENCED on purpose (runs for sent AND failed campaigns):
    //   1. campaign row — the deliveries' FK target must exist first (fired in
    //      parallel once, deliveries lost the race and vanished).
    //   2. delivery rows ('queued') — n8n flips them to delivered/failed.
    //   3. contact ledger stamp (independent; last for a clear order).
    // Only REAL dispatches write deliveries/contacts; demo sends record just
    // the campaign (flagged mock).
    const dispatched = res.ok && !res.mock
    void (async () => {
      await recordCampaign({
        id: previewPayload.campaign.id,
        sentBy: auth.userId,
        totalRecipients: totals.totalRows,
        enabledRecipients: sendableGroups.length,
        invalidRecipients: totals.invalid,
        duplicateRecipients: grouped?.exactDuplicateRows ?? totals.duplicate,
        excludedRecipients: excludedCount,
        mock: res.mock,
        branch: settings.branchName,
        sourceFile: fileName ?? undefined,
        payload: previewPayload,
        status: res.ok ? 'sent' : 'failed',
        errorMessage: res.ok ? null : (res.error ?? 'Error desconocido'),
      })
      if (dispatched) {
        const deliveryEntries: DeliveryEntry[] = previewPayload.recipients.map(
          (r) => ({ recipientId: r.id, phone: r.phone }),
        )
        await recordDeliveries(previewPayload.campaign.id, deliveryEntries)
        // Ledger: one entry per message group, stamped with the category so
        // the per-category re-contact guard works (migration 0007).
        const contactEntries: ContactEntry[] = sendableGroups.map(
          ({ group }) => ({
            phone: group.phone,
            ownerName: group.owner,
            petName: joinPetNames(group.pets),
            category: group.category,
          }),
        )
        await markContacted(contactEntries)
      }
    })().catch((err) => {
      console.warn('campaign persistence failed', err)
      if (dispatched) {
        toast.error(
          'La campaña se envió, pero no todo quedó registrado en el historial. Avísale al encargado.',
        )
      }
    })

    if (res.ok) {
      setSentAt(new Date())
      setMockSend(res.mock)
      setStatus('success')
      if (res.mock) {
        toast.success('Prueba completada: no se envió nada de verdad.', {
          description: res.detail,
        })
      } else {
        toast.success('Campaña enviada.', {
          description: 'Los mensajes ya salieron hacia WhatsApp.',
        })
      }
    } else {
      setStatus('error')
      setSendError(res.error ?? 'Error desconocido.')
      toast.error('No se pudo enviar la campaña.', {
        description: res.error,
      })
    }
  }

  const handleNewCampaign = () => {
    resetStore()
    navigate('/campaign')
  }

  // ── Success screen ──
  if (status === 'success') {
    return (
      <div className="p-6 max-w-2xl mx-auto animate-rise">
        <Card className="p-10 text-center">
          <div className="mx-auto mb-4 rounded-full bg-vegetal-soft text-vegetal p-4 w-fit animate-pop">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-xl font-semibold text-ink tracking-tight">
            ¡Campaña enviada!
          </h2>
          {sentAt && (
            <p className="text-2xs text-ink-mute mt-1" aria-live="polite">
              ✓ {sentAt.toLocaleTimeString('es-PE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          <p className="text-sm text-ink-soft mt-2 max-w-md mx-auto leading-relaxed">
            {mockSend
              ? 'Envío de prueba completado: no salió nada de verdad, pero el flujo quedó registrado.'
              : `Los ${payload?.recipients.length ?? 0} mensajes ya están en camino. Cada cliente los recibirá por WhatsApp en los próximos minutos.`}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 max-w-md mx-auto">
            <KpiCard
              icon={<Users size={14} />}
              label="Mensajes"
              value={payload?.recipients.length ?? 0}
              tone="vegetal"
            />
            <KpiCard
              icon={<Tag size={14} />}
              label="Categorías"
              value={categoryCounts.length}
              tone="neutral"
            />
            <KpiCard
              icon={<ImageIcon size={14} />}
              label="Archivo"
              value={fileName ? fileName.slice(0, 10) + (fileName.length > 10 ? '…' : '') : '—'}
              tone="neutral"
              className="text-center"
            />
          </div>
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button variant="secondary" size="md" onClick={() => navigate('/campaign/preview')}>
              <ArrowLeft size={14} />
              Volver a la revisión
            </Button>
            <Button variant="primary" size="md" onClick={handleNewCampaign}>
              Empezar nueva campaña
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ── Confirm / dispatch screen ──
  return (
    <div className="p-6 max-w-3xl mx-auto animate-rise">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft size={14} />
          Volver a la revisión
        </Button>
        <span className="text-sm text-ink-soft truncate">
          <span className="font-medium text-ink">{fileName}</span>
        </span>
      </div>

      {/* Warning if any recipient has no resolved template */}
      {missingTemplates && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-warn/30 bg-warn-soft/40 p-3 text-sm text-warn">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            Algunos destinatarios no tienen plantilla asignada (ni específica
            ni Predeterminada) y serán omitidos. Crea una plantilla
            Predeterminada en Ajustes para cubrirlos.
          </span>
        </div>
      )}

      <Card className="p-5">
        <h2 className="text-md font-semibold text-ink flex items-center gap-2">
          <Send size={16} className="text-clay" />
          Confirmar envío
        </h2>
        <p className="text-sm text-ink-soft mt-1">
          Al confirmar, cada cliente recibirá su mensaje por WhatsApp. El
          envío es en segundo plano: puedes cerrar esta pantalla cuando veas
          la confirmación.
        </p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            icon={<Users size={14} />}
            label="Mensajes"
            value={sendableGroups.length}
            tone="vegetal"
          />
          <KpiCard
            icon={<Tag size={14} />}
            label="Categorías"
            value={categoryCounts.length}
            tone="neutral"
          />
          <KpiCard
            icon={<ImageIcon size={14} />}
            label="Con imagen"
            value={withMediaCount}
            tone="neutral"
          />
          <KpiCard
            icon={<Send size={14} />}
            label="Modo"
            value={settings.webhookUrl ? 'Real' : 'Prueba'}
            foot={
              settings.webhookUrl
                ? 'los mensajes salen de verdad'
                : 'nada sale de verdad'
            }
            tone={settings.webhookUrl ? 'vegetal' : 'neutral'}
          />
        </div>

        {/* Category breakdown with proportional mini-bars (dashboard style) */}
        <div className="mt-5">
          <p className="text-sm text-ink-soft mb-2">
            Desglose por categoría
            <span className="text-ink-mute"> · {sendableGroups.length} mensajes</span>
          </p>
          {categoryCounts.length === 0 ? (
            <p className="text-sm text-ink-mute">Sin destinatarios.</p>
          ) : (
            <div className="space-y-1.5">
              {categoryCounts.map((c) => (
                <div key={c.name} className="flex items-center gap-2.5">
                  <span className="text-xs text-ink w-32 shrink-0 truncate">
                    {c.name}
                  </span>
                  <div className="flex-1 h-4 rounded-sm bg-mist-soft/70 overflow-hidden">
                    <div
                      className="h-full rounded-sm bg-vegetal/60"
                      style={{
                        width: `${(c.count / Math.max(...categoryCounts.map((x) => x.count), 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono tnum text-ink w-10 text-right shrink-0">
                    {c.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Volume warning (anti-ban): AFTER grouping/blocked filter — the real count */}
        {sendableGroups.length > SEND_BATCH_WARN && (
          <div
            className="mt-5 rounded-md border border-l-4 border-warn/40 border-l-warn bg-warn-soft/50 p-4 flex items-start gap-3"
            role="alert"
          >
            <div className="shrink-0 rounded-full bg-warn text-paper p-1.5 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-warn mb-1">
                Campaña grande: {sendableGroups.length} mensajes saldrán en
                una sola tanda
              </p>
              <p className="text-xs text-ink-soft leading-relaxed">
                Ya están combinadas las mascotas repetidas y excluidos los
                bloqueados (el Excel tenía {result.totals.totalRows} filas).
                Enviar muchos mensajes seguidos a un número aumenta el riesgo
                de que WhatsApp lo bloquee. Si puedes, importa y envía por
                partes (por categoría o primeros 40–50), o espera unas horas
                entre tandas.
              </p>
            </div>
          </div>
        )}

        {/* Webhook status pill */}
        <div className="mt-5 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium ${
              settings.webhookUrl
                ? 'bg-vegetal-soft text-vegetal'
                : 'bg-warn-soft text-warn'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                settings.webhookUrl ? 'bg-vegetal' : 'bg-warn'
              }`}
            />
            {settings.webhookUrl ? (
              <>
                Conexión lista ·{' '}
                <span className="font-mono">{maskUrl(settings.webhookUrl)}</span>
              </>
            ) : (
              'Sin conexión — modo prueba, conéctalo en Ajustes → Conexión'
            )}
          </span>
        </div>

        {/* Error state */}
        {status === 'error' && sendError && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft/40 p-3 text-sm text-danger">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">No se pudo enviar la campaña.</p>
              <p className="mt-0.5">{sendError}</p>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-mist pt-4">
          {status === 'error' && (
            <Button variant="secondary" size="md" onClick={() => setStatus('idle')}>
              Intentar de nuevo
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            onClick={() => setConfirmOpen(true)}
            disabled={status === 'sending' || sendableGroups.length === 0}
          >
            {status === 'sending' ? 'Enviando…' : 'Enviar campaña'}
            <Send size={16} />
          </Button>
        </div>
      </Card>

      {/* Confirmation modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="¿Confirmar envío?"
        description={
          sendableGroups.length > 0
            ? `Se enviarán ${sendableGroups.length} mensaje(s) de WhatsApp. Esta acción no se puede deshacer.`
            : ''
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirm}>
              Sí, enviar
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Revisa que los destinatarios sean correctos.{' '}
          {settings.webhookUrl
            ? 'Los mensajes saldrán ahora mismo.'
            : 'Estás en modo prueba: no se enviará nada de verdad.'}
        </p>
      </Modal>
</div>
  )
}
