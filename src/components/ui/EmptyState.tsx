import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-paper/30 px-6 py-16 text-center">
      {icon && <div className="text-canvas-fg/40">{icon}</div>}
      <h3 className="text-display text-lg">{title}</h3>
      {description && <p className="max-w-sm text-sm text-canvas-fg/60">{description}</p>}
      {action}
    </div>
  )
}
