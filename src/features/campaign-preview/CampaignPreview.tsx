import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  Filter,
  RotateCcw,
  Search,
  Users,
  X,
} from 'lucide-react'
import { Button, Input, Select, Stat } from '@/shared/components/ui'
import { useCampaignStore } from '@/shared/stores/campaignStore'
import { useSettingsStore } from '@/shared/stores/settingsStore'
import {
  buildSendableGroups,
  daysSince,
  defaultEnabledFor,
  normalizeCategoryName,
  recentlyContactedFor,
} from '@/lib/campaign'
import { groupRecipients, joinPetNames } from '@/lib/grouping'
import { GroupTable, type GroupRow } from './GroupTable'
import { MessagePreviewPanel } from './MessagePreviewPanel'

export function CampaignPreview() {
  const navigate = useNavigate()
  const result = useCampaignStore((s) => s.result)
  const fileName = useCampaignStore((s) => s.rawFileName)
  const recipientEnabled = useCampaignStore((s) => s.recipientEnabled)
  const selectedId = useCampaignStore((s) => s.selectedId)
  const selectRecipient = useCampaignStore((s) => s.selectRecipient)
  const setEnabledBulk = useCampaignStore((s) => s.setEnabledBulk)
  const setPhase = useCampaignStore((s) => s.setPhase)
  const resetStore = useCampaignStore((s) => s.reset)

  const categories = useSettingsStore((s) => s.categories)
  const templates = useSettingsStore((s) => s.templates)
  const recontactDays = useSettingsStore((s) => s.settings.recontactDays)

  // Guard: if there's no campaign in memory, go back to import with a toast.
  const notifiedRef = useRef(false)
  useEffect(() => {
    if (!result || result.recipients.length === 0) {
      if (!notifiedRef.current) {
        toast.info('Importa un archivo Excel para ver la campaña.')
        notifiedRef.current = true
      }
      navigate('/campaign', { replace: true })
    }
  }, [result, navigate])

  const grouping = useMemo(
    () => (result ? groupRecipients(result.recipients) : null),
    [result],
  )
  const groups = useMemo(
    () => grouping?.groups ?? [],
    [grouping],
  )

  const tableRows = useMemo<GroupRow[]>(() => {
    if (groups.length === 0) return []
    return groups.map((g) => {
      const primary = g.recipients[0]
      const enabled = g.recipients.some(
        (r) => recipientEnabled[r.id] ?? defaultEnabledFor(r, recontactDays),
      )
      const contact = primary.contactState
      // Last relevant contact: this category if recorded, else the legacy
      // overall stamp (rows written before migration 0007).
      const hasPerCat =
        !!contact?.lastContacts && Object.keys(contact.lastContacts).length > 0
      const last =
        (hasPerCat ? contact?.lastContacts?.[normalizeCategoryName(g.category)] : undefined) ??
        (hasPerCat ? undefined : contact?.lastContactedAt)
      const days = last ? daysSince(last) : null
      return {
        id: g.id,
        owner: g.owner,
        petsLabel: joinPetNames(g.pets),
        petCount: g.pets.length,
        phone: g.phone,
        category: g.category,
        enabled,
        lastContactAt: last,
        daysSinceContact: days,
        blocked: recentlyContactedFor(primary, g.category, recontactDays),
        noteCount: g.notes.length,
      }
    })
  }, [groups, recipientEnabled, recontactDays])

  const filters = useGroupFilters(tableRows)

  const toSendCount = useMemo(() => {
    if (!result) return 0
    return buildSendableGroups(
      groups,
      categories,
      templates,
      recipientEnabled,
      recontactDays,
    ).length
  }, [result, groups, categories, templates, recipientEnabled, recontactDays])

  const counts = useMemo(
    () => ({
      totalRows: result?.totals.totalRows ?? 0,
      messages: groups.length,
      notSent:
        (grouping?.exactDuplicateRows ?? 0) + (grouping?.deferredRows ?? 0),
      invalid: result?.totals.invalid ?? 0,
    }),
    [result, groups, grouping],
  )

  const selectedGroup = useMemo(() => {
    if (groups.length === 0 || !selectedId) return null
    return groups.find((g) => g.id === selectedId) ?? null
  }, [groups, selectedId])

  if (!result || !grouping) return null

  const handleBack = () => {
    setPhase('import')
    navigate('/campaign')
  }

  const handleNewFile = () => {
    resetStore()
    navigate('/campaign')
  }

  const handleSend = () => {
    if (toSendCount === 0) {
      toast.error('No hay destinatarios habilitados para enviar.')
      return
    }
    setPhase('send')
    navigate('/campaign/send')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-rise">
      {/* Top bar: back + file + new */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft size={14} />
            Volver
          </Button>
          <span className="text-sm text-ink-soft truncate">
            <span className="font-medium text-ink">{fileName}</span>
            <span className="text-ink-mute"> · {counts.totalRows} filas</span>
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleNewFile}>
          <RotateCcw size={14} />
          Importar otro
        </Button>
      </div>

      {/* Stat chips */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <Stat variant="chip" label="Filas" value={counts.totalRows} tone="neutral" />
        <Stat variant="chip" label="Mensajes" value={counts.messages} tone="neutral" />
        <Stat variant="chip" label="A enviar" value={toSendCount} tone="vegetal" highlight />
        <Stat
          variant="chip"
          label="No repetidos"
          value={counts.notSent}
          tone="warn"
        />
        <Stat variant="chip" label="Inválidos" value={counts.invalid} tone="danger" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2 mb-3">
        <div className="relative flex-1 min-w-[12rem] max-w-[18rem]">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none"
          />
          <Input
            value={filters.search}
            onChange={(e) => filters.setSearch(e.target.value)}
            placeholder="Buscar propietario, mascota o teléfono…"
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-ink-mute" />
          <Select
            value={filters.category}
            onChange={(e) => filters.setCategory(e.target.value)}
            className="w-auto"
          >
            <option value="">Todas las categorías</option>
            {result.detectedCategories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={filters.reset}
          disabled={!filters.isActive}
        >
          <X size={14} />
          Limpiar
        </Button>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setEnabledBulk(
                groups
                  .filter((g) => filters.filtered.some((r) => r.id === g.id))
                  .flatMap((g) => g.recipients.map((r) => r.id)),
                true,
              )
            }
          >
            <CheckCheck size={14} />
            Marcar todos visibles
          </Button>
        </div>
      </div>

      {/* Table + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-5">
        <div>
          <p className="text-xs text-ink-mute mb-2">
            {counts.messages} mensaje(s) para {counts.totalRows} filas del
            Excel. Un cliente con varias mascotas o servicios recibe un
            mensaje por servicio, sin repeticiones.
          </p>
          <GroupTable
            rows={filters.filtered}
            selectedId={selectedId}
            onSelect={(id) => selectRecipient(id)}
            onToggle={(row) => {
              const group = groups.find((g) => g.id === row.id)
              if (group) {
                setEnabledBulk(
                  group.recipients.map((r) => r.id),
                  !row.enabled,
                )
              }
            }}
          />
        </div>
        <div>
          <MessagePreviewPanel
            group={selectedGroup}
            onClose={() => selectRecipient(null)}
          />
        </div>
      </div>

      {/* Send action */}
      <div className="mt-6 flex items-center justify-between border-t border-mist pt-4">
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <Users size={14} />
          <span>
            <strong className="text-ink tnum">{toSendCount}</strong> mensaje(s)
            a enviar
          </span>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={handleSend}
          disabled={toSendCount === 0}
        >
          Enviar campaña
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  )
}

function useGroupFilters(rows: GroupRow[]) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (category && r.category !== category) return false
      if (search) {
        const haystack = `${r.owner} ${r.petsLabel} ${r.phone} ${r.category}`
        if (!haystack.toLowerCase().includes(search.trim().toLowerCase())) {
          return false
        }
      }
      return true
    })
  }, [rows, search, category])
  return {
    search,
    setSearch,
    category,
    setCategory,
    filtered,
    reset: () => {
      setSearch('')
      setCategory('')
    },
    isActive: search.trim() !== '' || category !== '',
  }
}
