import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CornerDownRight, GripVertical } from 'lucide-react'
import { clsx } from 'clsx'
import type { StoryBlock } from '@/lib/types'

export function StoryBlockListItem({
  block,
  active,
  depth = 0,
  onClick,
}: {
  block: StoryBlock
  active: boolean
  depth?: number
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: block.id,
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
        'flex items-center gap-1.5 border-2 transition-colors',
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
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 truncate py-2.5 pr-3 text-left text-sm font-semibold"
      >
        {depth > 0 && <CornerDownRight size={12} className="shrink-0 opacity-50" />}
        <span className="truncate">{block.title}</span>
      </button>
    </div>
  )
}
