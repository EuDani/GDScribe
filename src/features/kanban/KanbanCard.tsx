import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, CheckSquare } from 'lucide-react'
import type { KanbanCard as KanbanCardType } from '@/lib/types'
import { Badge, accentFromString } from '@/components/ui/Badge'
import { CardIcon } from '@/lib/iconMap'

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

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

  const doneCount = card.checklist.filter((i) => i.done).length
  const overdue = card.due_date ? new Date(card.due_date) < new Date(new Date().toDateString()) : false

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-grab touch-none overflow-hidden border-2 border-line bg-paper text-ink shadow-brutal-sm active:cursor-grabbing"
    >
      {card.cover_image_url && (
        <img src={card.cover_image_url} alt="" className="h-24 w-full border-b-2 border-line object-cover" />
      )}
      <div className="p-3">
        <div className="flex items-start gap-1.5">
          {card.icon && <span className="mt-0.5 shrink-0">{<CardIcon name={card.icon} size={14} />}</span>}
          <p className="text-sm font-semibold">{card.title}</p>
        </div>
        {card.description && (
          <p className="mt-1 line-clamp-2 text-xs text-ink/60">{card.description}</p>
        )}

        {(card.checklist.length > 0 || card.due_date) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink/60">
            {card.checklist.length > 0 && (
              <span className="flex items-center gap-1">
                <CheckSquare size={12} />
                {doneCount}/{card.checklist.length}
              </span>
            )}
            {card.due_date && (
              <span className={`flex items-center gap-1 ${overdue ? 'text-accent-red' : ''}`}>
                <CalendarDays size={12} />
                {formatDate(card.due_date)}
              </span>
            )}
          </div>
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
    </div>
  )
}
