import { useState, type ReactNode } from 'react'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button, Card, Input, Modal, EmptyState } from '@/shared/components/ui'
import { useSettingsStore } from '@/shared/stores/settingsStore'
import type { Category } from '@/lib/types'

export function CategoriesTab() {
  const categories = useSettingsStore((s) => s.categories)
  const templates = useSettingsStore((s) => s.templates)
  const addCategory = useSettingsStore((s) => s.addCategory)
  const updateCategory = useSettingsStore((s) => s.updateCategory)
  const removeCategory = useSettingsStore((s) => s.removeCategory)

  const [creating, setCreating] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const [editName, setEditName] = useState('')
  const [deleting, setDeleting] = useState<Category | null>(null)

  const submitCreate = () => {
    void addCategory(draftName).then(() => {
      setDraftName('')
      setCreating(false)
    })
  }

  const submitEdit = () => {
    if (!editing) return
    void updateCategory(editing.id, editName).then(() => {
      setEditing(null)
      setEditName('')
    })
  }

  const submitDelete = () => {
    if (!deleting) return
    void removeCategory(deleting.id).then(() => setDeleting(null))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-soft tnum">
          {categories.length} categoría{categories.length === 1 ? '' : 's'}
        </p>
        <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
          <Plus size={14} />
          Nueva categoría
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Tags size={24} />}
            title="Aún no hay categorías"
            description="Crea categorías para organizar tus plantillas de mensaje (Vacuna, Antipulgas, etc.)."
            action={
              <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
                <Plus size={14} />
                Crear primera categoría
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((c) => {
            const templateCount = templates.filter(
              (t) => t.categoryId === c.id,
            ).length
            return (
              <Card
                key={c.id}
                className="p-4 flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="rounded-sm bg-vegetal-soft text-vegetal p-2 shrink-0">
                    <Tags size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{c.name}</p>
                    <p className="text-2xs text-ink-mute tnum">
                      {templateCount} plantilla
                      {templateCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <IconButton
                    label="Editar"
                    onClick={() => {
                      setEditing(c)
                      setEditName(c.name)
                    }}
                    icon={<Pencil size={14} />}
                  />
                  <IconButton
                    label="Eliminar"
                    danger
                    onClick={() => setDeleting(c)}
                    icon={<Trash2 size={14} />}
                  />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Nueva categoría"
        description="Las categorías organizan tus plantillas de mensaje y se asignan automáticamente al importar el Excel."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={submitCreate}
              disabled={!draftName.trim()}
            >
              Crear
            </Button>
          </>
        }
      >
        <label className="text-sm text-ink-soft block mb-1.5">Nombre</label>
        <Input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="p. ej. Vacuna, Antipulgas, Hidratación"
          onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Editar categoría"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={submitEdit}
              disabled={!editName.trim() || editName === editing?.name}
            >
              Guardar
            </Button>
          </>
        }
      >
        <label className="text-sm text-ink-soft block mb-1.5">Nombre</label>
        <Input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitEdit()}
        />
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Eliminar categoría"
        description={
          deleting
            ? `Las plantillas asociadas a "${deleting.name}" serán reasignadas a la plantilla Predeterminada.`
            : ''
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={submitDelete}>
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          ¿Seguro que quieres eliminar{' '}
          <span className="font-semibold">{deleting?.name}</span>?
        </p>
      </Modal>
    </div>
  )
}
function IconButton({
  label,
  danger,
  onClick,
  icon,
}: {
  label: string
  danger?: boolean
  onClick: () => void
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'rounded-sm p-1.5 text-ink-mute transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
        danger
          ? 'hover:bg-danger-soft hover:text-danger'
          : 'hover:bg-mist-soft hover:text-ink',
      )}
    >
      {icon}
    </button>
  )
}
