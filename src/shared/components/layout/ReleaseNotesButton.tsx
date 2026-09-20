import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Modal } from '@/shared/components/ui'
import { cn } from '@/lib/cn'
import {
  RELEASE_NOTES,
  type ReleaseEntry,
} from '@/app/releaseNotes'
import {
  releaseBadgeCount,
  unseenReleaseEntries,
} from '@/app/releaseVisibility'

/**
 * "Novedades" bell for clinic staff. Badge = relevant releases newer than
 * the last one opened (tracked per browser, no database: the notes ship
 * inside the build). Opening the modal marks everything as seen.
 */
const STORAGE_KEY = 'vcm:releases:lastSeen:v1'

function readLastSeen(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeLastSeen(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // private-mode browsers etc.: badge just stays, harmless.
  }
}

export function ReleaseNotesButton({ className }: { className?: string }) {
  const [lastSeen, setLastSeen] = useState<string | null>(readLastSeen)
  const [open, setOpen] = useState(false)
  const badge = releaseBadgeCount(lastSeen)

  const handleOpen = () => {
    const newest = RELEASE_NOTES[0]
    if (newest) writeLastSeen(newest.id)
    setLastSeen(newest ? newest.id : null)
    setOpen(true)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className={cn(
          'relative rounded-sm p-2 text-ink-soft hover:bg-mist-soft hover:text-ink transition-colors',
          badge > 0 && 'text-vegetal',
          className,
        )}
        title="Novedades de la app"
        aria-label="Novedades de la app"
      >
        <Bell size={16} />
        {badge > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-clay text-paper text-2xs font-semibold flex items-center justify-center tnum"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {badge}
          </span>
        )}
      </button>

      <ReleaseNotesModal
        open={open}
        onClose={() => setOpen(false)}
        unseen={unseenReleaseEntries(lastSeen)}
      />
    </>
  )
}

function ReleaseNotesModal({
  open,
  onClose,
  unseen,
}: {
  open: boolean
  onClose: () => void
  unseen: ReleaseEntry[]
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novedades de la app"
      description="Lo que cambió y cómo te conviene trabajar ahora. Lo más nuevo primero."
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {RELEASE_NOTES.map((entry, i) => {
          const isNew = unseen.some((u) => u.id === entry.id)
          return (
            <article
              key={entry.id}
              className={cn(
                'rounded-md border p-3.5',
                isNew
                  ? 'border-vegetal/30 bg-vegetal-soft/25'
                  : i === 0
                    ? 'border-mist bg-paper'
                    : 'border-mist bg-mist-soft/30 opacity-90',
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-sm font-semibold text-ink">{entry.title}</h3>
                <span
                  className="text-2xs text-ink-mute shrink-0"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {entry.date}
                </span>
              </div>
              {isNew && (
                <p className="text-2xs text-vegetal font-medium mb-1 uppercase tracking-wide">
                  ✦ Nuevo para ti
                </p>
              )}
              <ul className="text-sm text-ink-soft space-y-1.5 list-disc pl-4">
                {entry.items.map((item, j) => (
                  <li key={j} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
    </Modal>
  )
}
