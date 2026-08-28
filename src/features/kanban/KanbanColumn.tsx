import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Trash2 } from 'lucide-react'
import type { KanbanCard, KanbanColumn as KanbanColumnType } from '@/lib/types'
import { KanbanCardView } from '@/features/kanban/KanbanCard'

export function KanbanColumnView({
  column,
  cards,
  onAddCard,
  onDeleteColumn,
  onCardClick,
}: {
  column: KanbanColumnType
  cards: KanbanCard[]
  onAddCard: () => void
  onDeleteColumn: () => void
  onCardClick: (card: KanbanCard) => void
}) {
  const { setNodeRef } = useDroppable({ id: column.id, data: { type: 'column' } })

  return (
    <div className="flex w-72 shrink-0 flex-col border-2 border-ink bg-ink-soft">
      <div
        className="flex items-center justify-between gap-2 border-b-2 border-ink px-3 py-2.5"
        style={{ boxShadow: `inset 4px 0 0 0 ${column.color}` }}
      >
        <h3 className="text-label text-xs font-semibold">
          {column.name} <span className="text-paper/40">({cards.length})</span>
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onAddCard}
            aria-label="Novo card"
            className="cursor-pointer border-2 border-ink p-1 text-paper/60 hover:bg-accent-yellow hover:text-ink"
          >
            <Plus size={13} />
          </button>
          <button
            type="button"
            onClick={onDeleteColumn}
            aria-label="Excluir coluna"
            className="cursor-pointer border-2 border-ink p-1 text-paper/60 hover:bg-accent-red hover:text-paper"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div ref={setNodeRef} className="flex-1 space-y-2 p-2.5" style={{ minHeight: 80 }}>
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCardView key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
