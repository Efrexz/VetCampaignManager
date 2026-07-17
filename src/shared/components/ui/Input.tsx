import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-sm bg-paper border border-mist px-3 text-sm',
        'placeholder:text-ink-mute outline-none',
        'focus:border-vegetal transition-colors',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-sm bg-paper border border-mist px-3 py-2 text-sm',
      'placeholder:text-ink-mute outline-none resize-y',
      'focus:border-vegetal transition-colors',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'h-9 w-full rounded-sm bg-paper border border-mist px-3 text-sm',
      'outline-none focus:border-vegetal transition-colors',
      className,
    )}
    {...props}
  />
))
Select.displayName = 'Select'