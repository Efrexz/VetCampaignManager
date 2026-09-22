import { useMemo, useState } from 'react'
import {
  flexRender,
  useTable,
  tableFeatures,
  rowSortingFeature,
  columnFilteringFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createSortedRowModel,
  createFilteredRowModel,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, Inbox } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Chip, Table, Tbody, Td, Th, Thead, Tr } from '@/shared/components/ui'

export interface GroupRow {
  id: string
  owner: string
  petsLabel: string
  petCount: number
  phone: string
  category: string
  enabled: boolean
  /** ISO of the last contact — this category, or legacy overall fallback. */
  lastContactAt?: string
  daysSinceContact: number | null
  blocked: boolean
  /** Permanent exclusion: chip rojo, casilla bloqueada, nunca enviable. */
  doNotContact: boolean
  exclusionNote?: string
  noteCount: number
}

interface Props {
  rows: GroupRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggle: (row: GroupRow) => void
}

const features = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
})

const columnHelper = createColumnHelper<typeof features, GroupRow>()

export function GroupTable({ rows, selectedId, onSelect, onToggle }: Props) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'enabled',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original
          return (
            <input
              type="checkbox"
              checked={r.enabled}
              disabled={r.doNotContact}
              onChange={() => onToggle(r)}
              onClick={(e) => e.stopPropagation()}
              className="accent-vegetal h-4 w-4 align-middle disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                r.doNotContact
                  ? 'Cliente vetado: se excluyó en Ajustes → Clientes excluidos. No se puede activar.'
                  : r.enabled
                    ? 'Excluir del envío'
                    : 'Incluir en el envío'
              }
            />
          )
        },
        size: 32,
      }),
      columnHelper.accessor('owner', {
        header: 'Propietario',
        cell: ({ row }) => (
          <span className="font-medium text-ink truncate block max-w-[12rem]">
            {row.original.owner}
          </span>
        ),
      }),
      columnHelper.accessor('petsLabel', {
        header: 'Mascotas',
        cell: ({ row }) => {
          const r = row.original
          return (
            <span className="flex items-center gap-1.5">
              <span
                className="text-ink-soft truncate block max-w-[9rem]"
                title={r.petsLabel}
              >
                {r.petsLabel || (
                  <span className="text-ink-mute italic">—</span>
                )}
              </span>
              {r.petCount > 1 && (
                <Chip tone="vegetal" className="!py-0">
                  {r.petCount}
                </Chip>
              )}
            </span>
          )
        },
      }),
      columnHelper.accessor('phone', {
        header: 'Teléfono',
        cell: ({ row }) => (
          <span
            className="text-ink text-sm"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {row.original.phone}
          </span>
        ),
      }),
      columnHelper.accessor('category', {
        header: 'Servicio',
        cell: ({ row }) => (
          <span className="text-ink-soft">{row.original.category}</span>
        ),
      }),
      columnHelper.display({
        id: 'status',
        header: 'Estado',
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original
          return (
            <span className="flex flex-wrap gap-1">
              {r.doNotContact && (
                <Chip
                  tone="danger"
                  title={
                    r.exclusionNote
                      ? `Cliente vetado: ${r.exclusionNote}`
                      : 'Cliente vetado en Ajustes → Clientes excluidos'
                  }
                >
                  NO CONTACTAR
                </Chip>
              )}
              {r.exclusionNote && (
                <span className="text-2xs text-danger self-center max-w-[12rem] truncate">
                  {r.exclusionNote}
                </span>
              )}
              {!r.doNotContact && r.blocked && (
                <Chip
                  tone="warn"
                  title="Ya se le escribió por este servicio hace pocos días (ventana configurable en Ajustes). Puedes forzar el envío si es necesario."
                >
                  {r.daysSinceContact === 0
                    ? 'Hoy'
                    : r.daysSinceContact === 1
                      ? 'Ayer'
                      : `Hace ${r.daysSinceContact}d`}{' '}
                  por {r.category}
                </Chip>
              )}
              {!r.doNotContact && !r.blocked && <Chip tone="vegetal">Listo</Chip>}
              {r.noteCount > 0 && (
                <Chip
                  tone="neutral"
                  title="Filas del Excel que quedaron dentro de este mensaje (no se envían aparte)"
                >
                  {r.noteCount} nota{r.noteCount === 1 ? '' : 's'}
                </Chip>
              )}
            </span>
          )
        },
      }),
    ],
    [onToggle],
  )

  const table = useTable({
    features,
    data: rows,
    columns: columns as ColumnDef<typeof features, GroupRow, unknown>[],
    state: { sorting },
    onSortingChange: setSorting,
  })

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-mist bg-paper py-12 text-center">
        <Inbox className="mx-auto mb-2 text-ink-mute" size={22} />
        <p className="text-sm text-ink-soft">
          No hay mensajes que coincidan con los filtros.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-mist bg-paper overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <Thead className="bg-mist-soft/60">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <Th
                    key={h.id}
                    style={{
                      width: h.getSize() !== 150 ? h.getSize() : undefined,
                    }}
                  >
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button
                        className={cn(
                          'inline-flex items-center gap-1 hover:text-ink transition-colors',
                          h.column.getIsSorted() && 'text-ink',
                        )}
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <ArrowUpDown size={11} />
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </Th>
                ))}
              </tr>
            ))}
          </Thead>
          <Tbody>
            {table.getRowModel().rows.map((row) => {
              const r = row.original
              const active = r.id === selectedId
              return (
                <Tr
                  key={r.id}
                  onClick={() => onSelect(r.id)}
                  className={cn(
                    'cursor-pointer transition-colors',
                    active ? 'bg-vegetal-soft/30' : 'hover:bg-mist-soft/30',
                    !r.enabled && 'opacity-50',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </Td>
                  ))}
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </div>
    </div>
  )
}
