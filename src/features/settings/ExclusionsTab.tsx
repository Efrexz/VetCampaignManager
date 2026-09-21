import { useEffect, useState } from 'react'
import { Ban, Loader2, Plus, ShieldOff, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Card, Chip, Input, Table, Tbody, Td, Th, Thead, Tr } from '@/shared/components/ui'
import { useSettingsStore } from '@/shared/stores/settingsStore'
import { normalizePhone } from '@/lib/phone'
import { listContactExclusions, setContactFlags } from '@/storage/exports'
import type { ContactExclusion } from '@/lib/types'

/**
 * "Clientes excluidos" tab: manages the per-sede exclusion list. Storage is
 * phone-keyed (one ledger row per phone); a client with several phones
 * becomes several rows sharing the same note, and the send guard reads the
 * flag from the ledger — exclusion survives every future Excel export.
 */
export function ExclusionsTab() {
  const countryCode = useSettingsStore((s) => s.settings.defaultCountryCode)
  const [rows, setRows] = useState<ContactExclusion[] | null>(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')

  const load = () => {
    listContactExclusions()
      .then(setRows)
      .catch((err) => {
        console.warn('exclusions load failed', err)
        toast.error('No se pudo cargar la lista de excluidos.')
        setRows([])
      })
  }

  useEffect(load, [])

  const handleAdd = async () => {
    const phones = parsePhoneList(phoneInput, countryCode)
    if (phones.length === 0) {
      toast.error('Escribe al menos un celular válido: 9 dígitos empezando con 9.')
      return
    }
    const unique = [...new Set(phones)]
    setBusy(true)
    try {
      await setContactFlags(
        unique.map((phone) => ({
          phone,
          ownerName: nameInput.trim() || undefined,
          note: noteInput.trim() || undefined,
          doNotContact: true,
        })),
      )
      toast.success(
        unique.length === 1
          ? 'Cliente excluido. No recibirá más mensajes en esta sede.'
          : `${unique.length} teléfonos excluidos. No recibirán más mensajes en esta sede.`,
      )
      setPhoneInput('')
      setNameInput('')
      setNoteInput('')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo excluir.')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (row: ContactExclusion) => {
    setBusy(true)
    try {
      await setContactFlags([
        {
          phone: row.phone,
          ownerName: row.ownerName,
          petName: row.petName,
          doNotContact: false,
        },
      ])
      toast.success(`${row.phone} vuelve a estar disponible para envíos.`)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo quitar.')
    } finally {
      setBusy(false)
    }
  }

  const filtered = (rows ?? []).filter((r) => {
    if (!search.trim()) return true
    const hay = `${r.phone} ${r.ownerName} ${r.note ?? ''}`
    return hay.toLowerCase().includes(search.trim().toLowerCase())
  })

  if (rows === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-mute py-10 justify-center">
        <Loader2 className="animate-spin" size={16} />
        Cargando lista…
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Card className="p-5 border-danger/30">
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded-sm bg-danger-soft text-danger p-1.5">
            <Ban size={16} />
          </span>
          <h3 className="text-md font-semibold text-ink">
            Clientes excluidos
            {rows.length > 0 && (
              <Chip tone="danger" className="ml-2">
                {rows.length}
              </Chip>
            )}
          </h3>
        </div>
        <p className="text-sm text-ink-soft mb-4">
          Los teléfonos que agregues aquí quedan vetados para esta sede: no
          llegan a la revisión marcados para envío, la casilla queda bloqueada
          y nunca se les escribe. Úsalo con clientes problemáticos o que
          pidieron no recibir mensajes.
        </p>

        {/* Add form */}
        <label className="text-sm text-ink-soft block mb-1.5">
          Teléfonos (puedes pegar varios separados por coma)
        </label>
        <div className="flex gap-2 mb-2">
          <Input
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="917415461, 987654322 - 911111222"
            style={{ fontFamily: 'var(--font-mono)' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !busy) void handleAdd()
            }}
          />
          <Button
            variant="primary"
            size="md"
            onClick={() => void handleAdd()}
            disabled={busy}
          >
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
            Excluir
          </Button>
        </div>
        <p className="text-xs text-ink-mute mb-4">
          Un cliente con varios números: pégalos todos juntos. Si cualquier
          número aparece en un Excel futuro, ese mensaje no sale.
        </p>

        <label className="text-sm text-ink-soft block mb-1.5">
          Nombre del cliente (opcional)
        </label>
        <Input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="p. ej. Juan Pérez"
          className="max-w-xs mb-3"
        />

        <label className="text-sm text-ink-soft block mb-1.5">
          Motivo (opcional) — se ve al lado del sello rojo
        </label>
        <Input
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          placeholder="p. ej. Molesto por mensajes, preguntar en mostrador"
        />
      </Card>

      {/* List */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por teléfono, nombre o nota…"
            className="max-w-xs"
          />
          <span className="text-xs text-ink-mute">
            {filtered.length} de {rows.length}
          </span>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-ink-mute py-6 text-center">
            {rows.length === 0
              ? 'Nadie excluido todavía en esta sede.'
              : 'Nada coincide con tu búsqueda.'}
          </p>
        ) : (
          <div className="rounded-md border border-danger/30 bg-danger-soft/20 overflow-hidden">
            <Table>
              <Thead className="bg-danger-soft/40">
                <tr>
                  <Th>Número</Th>
                  <Th>Nombre</Th>
                  <Th>Motivo</Th>
                  <Th />
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((row) => (
                  <Tr key={row.phone}>
                    <Td
                      className="text-ink"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {row.phone}
                    </Td>
                    <Td className="text-ink-soft">{row.ownerName || '—'}</Td>
                    <Td className="text-warn">{row.note || '—'}</Td>
                    <Td className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleRemove(row)}
                        title="Quitar la exclusión"
                      >
                        <Undo2 size={13} />
                        Quitar
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </div>

      <p className="text-xs text-ink-mute flex items-center gap-1.5">
        <ShieldOff size={13} />
        En la revisión de campaña, estos clientes muestran el sello rojo "NO
        CONTACTAR" y su casilla no se puede activar.
      </p>
    </div>
  )
}

function parsePhoneList(raw: string, countryCode: string): string[] {
  const out: string[] = []
  for (const piece of raw.split(/[,\n]| - /)) {
    const { normalized, valid } = normalizePhone(piece, countryCode)
    if (valid) out.push(normalized)
  }
  return out
}
