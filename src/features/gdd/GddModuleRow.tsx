import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CornerDownRight, GripVertical } from 'lucide-react'
import { clsx } from 'clsx'
import type { GddModule } from '@/lib/types'

export function GddModuleRow({
  module,
  active,
  phaseLabel,
  depth = 0,
  onClick,
}: {
  module: GddModule
  active: boolean
  phaseLabel: string
  depth?: number
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: module.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        marginLeft: depth * 16,
      }}
      className={clsx(
        'flex items-center border-2 transition-colors',
        isOver && 'border-accent-yellow',
        !isOver && active && 'border-line bg-accent-yellow text-ink shadow-brutal-sm',
        !isOver && !active && 'border-line/40 bg-surface text-canvas-fg/80 hover:border-line',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Reordenar"
        className="cursor-grab touch-none px-1.5 py-2.5 text-current/50 active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 cursor-pointer items-start gap-1.5 py-2.5 pr-3 text-left">
        {depth > 0 && <CornerDownRight size={12} className="mt-0.5 shrink-0 opacity-50" />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{module.title}</div>
          <div className="text-label mt-0.5 flex items-center gap-1.5 text-[10px] opacity-60">
            {phaseLabel}
            {module.status && <span>· {module.status}</span>}
          </div>
        </div>
      </button>
    </div>
  )
}
