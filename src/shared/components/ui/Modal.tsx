import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full max-w-lg rounded-md bg-paper border border-mist shadow-card',
          'animate-[modalIn_150ms_ease-out]',
          className,
        )}
      >
        <style>{`@keyframes modalIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>
        {(title || description) && (
          <div className="px-5 pt-4 pb-3 pr-10">
            {title && (
              <h2 className="text-lg font-semibold leading-tight">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-ink-soft mt-1">{description}</p>
            )}
          </div>
        )}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-sm p-1.5 text-ink-mute hover:bg-mist-soft hover:text-ink transition-colors"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-mist flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}