import { clsx } from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  children: ReactNode
  className?: string
  padded?: boolean
}

export function Card({ children, className, padded = true, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'border-2 border-ink bg-ink-soft shadow-brutal',
        padded && 'p-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
