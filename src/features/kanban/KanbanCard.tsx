import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { KanbanCard as KanbanCardType } from '@/lib/types'
import { Badge, accentFromString } from '@/components/ui/Badge'

export function KanbanCardView({
  card,
  onClick,
}: {
  card: KanbanCardType
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId: card.column_id },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-grab touch-none border-2 border-ink bg-paper p-3 text-ink shadow-brutal-sm active:cursor-grabbing"
    >
      <p className="text-sm font-semibold">{card.title}</p>
      {card.description && (
        <p className="mt-1 line-clamp-2 text-xs text-ink/60">{card.description}</p>
      )}
      {card.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.tags.map((tag) => (
            <Badge key={tag} accent={accentFromString(tag)}>
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
