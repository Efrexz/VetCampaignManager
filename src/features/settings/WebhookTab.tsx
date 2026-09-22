import { useState } from 'react'
import {
  Webhook,
  Save,
  Eye,
  EyeOff,
  Building2,
  CalendarClock,
  KeyRound,
} from 'lucide-react'
import { Button, Card, Input } from '@/shared/components/ui'
import { useSettingsStore } from '@/shared/stores/settingsStore'
import { useTenantStore } from '@/shared/stores/tenantStore'
import { HAS_SUPABASE } from '@/integrations/supabase'
import { maskUrl } from '@/lib/format'
import { RECONTACT_DAYS } from '@/lib/campaign'

export function WebhookTab() {
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const role = useTenantStore(
    (s) =>
      s.tenants.find((t) => t.id === s.currentTenantId)?.role ?? 'owner',
  )

  // Branch fields (webhook, name, window) live on the branches row, and RLS
  // restricts its update to owner/admin. Show read-only for receptores so a
  // save attempt never surfaces an opaque permission error.
  const canEdit = !HAS_SUPABASE || role !== 'recepcionista'

  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl)
  const [token, setToken] = useState(settings.hmacSecret ?? '')
  const [branchName, setBranchName] = useState(settings.branchName ?? '')
  const [recontactRaw, setRecontactRaw] = useState(
    String(settings.recontactDays ?? RECONTACT_DAYS),
  )
  const [showUrl, setShowUrl] = useState(false)

  const recontactDays = parseRecontactDays(recontactRaw)
  const dirty =
    canEdit &&
    (webhookUrl !== settings.webhookUrl ||
      token !== (settings.hmacSecret ?? '') ||
      branchName !== (settings.branchName ?? '') ||
      recontactDays !== (settings.recontactDays ?? RECONTACT_DAYS))

  const handleSave = () => {
    void updateSettings({
      webhookUrl: webhookUrl.trim(),
      branchName: branchName.trim(),
      recontactDays,
      hmacSecret: token.trim(),
    })
  }

  // Mask URL for display when not editing.
  const masked = webhookUrl ? maskUrl(webhookUrl) : ''

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Connection status pill */}
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium ${
          settings.webhookUrl.trim()
            ? 'bg-vegetal-soft text-vegetal'
            : 'bg-warn-soft text-warn'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            settings.webhookUrl.trim() ? 'bg-vegetal' : 'bg-warn'
          }`}
        />
        {settings.webhookUrl.trim()
          ? 'Conectado — los envíos salen de verdad'
          : 'Sin configurar — los envíos son solo prueba'}
      </span>

      {!canEdit && (
        <div className="rounded-md border border-mist bg-mist-soft/40 p-3 text-sm text-ink-soft flex items-start gap-2">
          <Eye size={14} className="mt-0.5 shrink-0" />
          <span>
            Los ajustes de esta pestaña los maneja el administrador de tu
            clínica. Si algo está mal conectado, avísale y él lo cambia aquí.
          </span>
        </div>
      )}

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded-sm bg-vegetal-soft text-vegetal p-1.5">
            <Webhook size={16} />
          </span>
          <h3 className="text-md font-semibold text-ink">
            Conexión de envío
          </h3>
        </div>
        <p className="text-sm text-ink-soft mb-4">
          Este enlace conecta la app con tu WhatsApp: cuando envías una
          campaña, los mensajes salen por aquí. Pégalo una vez y queda
          guardado. Si no lo tienes, pídeselo a quien instaló el sistema.
        </p>

        <label className="text-sm text-ink-soft block mb-1.5">
          Enlace de conexión
        </label>
        <div className="flex gap-2">
          <Input
            type={showUrl ? 'url' : 'text'}
            value={showUrl ? webhookUrl : webhookUrl ? masked : ''}
            onChange={(e) => setWebhookUrl(e.target.value)}
            readOnly={!canEdit || (!showUrl && webhookUrl !== '')}
            placeholder="https://n8n.tu-clinica.com/webhook/campaign"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUrl((s) => !s)}
            title={showUrl ? 'Ocultar' : 'Mostrar'}
          >
            {showUrl ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
        </div>
        {!webhookUrl && (
          <p className="text-xs text-ink-mute mt-1.5">
            Si lo dejas vacío, la app queda en modo prueba: verás cómo sería
            el envío pero no se mandará nada de verdad.
          </p>
        )}
      </Card>

      {canEdit && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-sm bg-vegetal-soft text-vegetal p-1.5">
              <KeyRound size={16} />
            </span>
            <h3 className="text-md font-semibold text-ink">
              Clave secreta de envío (recomendada)
            </h3>
          </div>
          <p className="text-sm text-ink-soft mb-4">
            Evita que alguien fuera de la clínica pueda disparar envíos si el
            enlace se filtra: la app lo envía como encabezado{' '}
            <code className="font-mono">X-VCM-Token</code>. En n8n, activa
            Header Auth en el nodo Webhook con ese mismo nombre y el mismo
            valor. Déjalo vacío si no lo usas todavía.
          </p>
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="una clave larga y aleatoria"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </Card>
      )}

      <Card className="p-5">
        <h3 className="text-md font-semibold text-ink mb-1">
          País de los teléfonos
        </h3>
        <p className="text-sm text-ink-soft mb-4">
          Los números del Excel se leen como celulares de Perú: 9 dígitos que
          empiezan con 9. Los números fijos o incompletos se marcan como
          inválidos y no se les envía.
        </p>
        <Input
          value={settings.defaultCountryCode}
          readOnly
          className="max-w-xs"
        />
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded-sm bg-vegetal-soft text-vegetal p-1.5">
            <Building2 size={16} />
          </span>
          <h3 className="text-md font-semibold text-ink">Sede</h3>
        </div>
        <p className="text-sm text-ink-soft mb-4">
          Nombre de esta sede (por ejemplo "Sede Norte"). Cada campaña guardada
          en el historial llevará esta etiqueta, para que puedas comparar el
          rendimiento entre sedes en el panel.
        </p>
        <label className="text-sm text-ink-soft block mb-1.5">
          Nombre de la sede
        </label>
        <Input
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          readOnly={!canEdit}
          placeholder="Sede Norte"
          className="max-w-xs"
        />
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded-sm bg-vegetal-soft text-vegetal p-1.5">
            <CalendarClock size={16} />
          </span>
          <h3 className="text-md font-semibold text-ink">
            Días de espera entre mensajes
          </h3>
        </div>
        <p className="text-sm text-ink-soft mb-4">
          Si esta sede ya le escribió a un cliente por el MISMO servicio hace
          menos días que este número, la fila aparece desmarcada y no se le
          envía otro mensaje (puedes forzarla desde la revisión). Un aviso de
          un servicio distinto nunca queda bloqueado por otro.
        </p>
        <label className="text-sm text-ink-soft block mb-1.5">
          Días de espera (1–90)
        </label>
        <Input
          type="number"
          min={1}
          max={90}
          value={recontactRaw}
          onChange={(e) => setRecontactRaw(e.target.value)}
          readOnly={!canEdit}
          className="max-w-xs"
        />
        <p className="text-xs text-ink-mute mt-1.5">
          Valor guardado para toda la clínica. Recomendado: 10–15 días. Ejemplo:
          si pones 15, un cliente contactado por "Baño" hace 10 días no recibe
          otro mensaje de Baño.
        </p>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={!dirty}
          >
            <Save size={14} />
            Guardar
          </Button>
        </div>
      )}
    </div>
  )
}

/** Clamp the configured window to 1–90; fall back to the default. */
function parseRecontactDays(raw: string): number {
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) return RECONTACT_DAYS
  return Math.min(90, Math.max(1, n))
}
