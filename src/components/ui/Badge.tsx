import { clsx } from 'clsx'
import type { ReactNode } from 'react'

const ACCENTS = ['red', 'yellow', 'blue', 'green', 'purple'] as const
type Accent = (typeof ACCENTS)[number]

const ACCENT_CLASSES: Record<Accent, string> = {
  red: 'bg-accent-red text-ink',
  yellow: 'bg-accent-yellow text-ink',
  blue: 'bg-accent-blue text-ink',
  green: 'bg-accent-green text-ink',
  purple: 'bg-accent-purple text-ink',
}

export function accentFromString(value: string): Accent {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0
  return ACCENTS[Math.abs(hash) % ACCENTS.length]
}

export function Badge({
  children,
  accent = 'yellow',
  outline = false,
}: {
  children: ReactNode
  accent?: Accent
  outline?: boolean
}) {
  return (
    <span
      className={clsx(
        'text-label inline-flex items-center border-2 border-ink px-2 py-0.5 text-[11px] font-semibold',
        outline ? 'bg-transparent text-paper' : ACCENT_CLASSES[accent],
      )}
    >
      {children}
    </span>
  )
}
