import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { clsx } from 'clsx'
import type { StoryBlock } from '@/lib/types'

export function StoryBlockListItem({
  block,
  active,
  onClick,
}: {
  block: StoryBlock
  active: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={clsx(
        'flex items-center gap-1.5 border-2 transition-colors',
        active ? 'border-line bg-accent-yellow text-ink shadow-brutal-sm' : 'border-line/40 bg-surface text-canvas-fg/80 hover:border-line',
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
      <button type="button" onClick={onClick} className="min-w-0 flex-1 cursor-pointer truncate py-2.5 pr-3 text-left text-sm font-semibold">
        {block.title}
      </button>
    </div>
  )
}
