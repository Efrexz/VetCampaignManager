import {
  forwardRef,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

export const Table = forwardRef<
  HTMLTableElement,
  HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={cn('w-full border-collapse text-sm', className)}
    {...props}
  />
))
Table.displayName = 'Table'

export const Thead = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('border-b border-mist', className)}
    {...props}
  />
))
Thead.displayName = 'Thead'

export const Tbody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn(className)} {...props} />
))
Tbody.displayName = 'Tbody'

export const Tr = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn('group/tr border-b border-mist last:border-0', className)}
    {...props}
  />
))
Tr.displayName = 'Tr'

export const Th = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'text-left text-2xs font-semibold uppercase tracking-wide text-ink-mute',
      'px-3 py-2',
      className,
    )}
    {...props}
  />
))
Th.displayName = 'Th'

export const Td = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('px-3 py-2 align-middle', className)}
    {...props}
  />
))
Td.displayName = 'Td'