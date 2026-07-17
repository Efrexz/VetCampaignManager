import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-md bg-paper border border-mist',
        className,
      )}
      {...props}
    />
  )
}

export function CardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-5 pt-4 pb-3 flex items-center gap-2', className)}
      {...props}
    />
  )
}