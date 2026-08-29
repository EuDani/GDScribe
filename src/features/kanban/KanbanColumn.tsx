import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import type { KanbanCard, KanbanColumn as KanbanColumnType } from '@/lib/types'
import { KanbanCardView } from '@/features/kanban/KanbanCard'

export function KanbanColumnView({
  column,
  cards,
  onAddCard,
  onDeleteColumn,
  onRenameColumn,
  onCardClick,
}: {
  column: KanbanColumnType
  cards: KanbanCard[]
  onAddCard: () => void
  onDeleteColumn: () => void
  onRenameColumn: (name: string) => void
  onCardClick: (card: KanbanCard) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: 'column' } })
  const [editingName, setEditingName] = useState(false)

  return (
    <div
      className={clsx(
        'flex w-72 shrink-0 flex-col border-2 bg-surface transition-colors',
        isOver ? 'border-accent-yellow' : 'border-line',
      )}
    >
      <div
        className="flex items-center justify-between gap-2 border-b-2 border-line px-3 py-2.5"
        style={{ boxShadow: `inset 4px 0 0 0 ${column.color}` }}
      >
        {editingName ? (
          <input
            autoFocus
            defaultValue={column.name}
            onBlur={(e) => {
              const value = e.target.value.trim()
              if (value && value !== column.name) onRenameColumn(value)
              setEditingName(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') setEditingName(false)
            }}
            className="text-label min-w-0 flex-1 border border-line/40 bg-transparent px-1 py-0.5 text-xs text-canvas-fg outline-none"
          />
        ) : (
          <h3
            onClick={() => setEditingName(true)}
            className="text-label cursor-text truncate text-xs font-semibold"
            title="Clique para renomear"
          >
            {column.name} <span className="text-canvas-fg/40">({cards.length})</span>
          </h3>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onAddCard}
            aria-label="Novo card"
            className="cursor-pointer border-2 border-line p-1 text-canvas-fg/60 hover:bg-accent-yellow hover:text-ink"
          >
            <Plus size={13} />
          </button>
          <button
            type="button"
            onClick={onDeleteColumn}
            aria-label="Excluir coluna"
            className="cursor-pointer border-2 border-line p-1 text-canvas-fg/60 hover:bg-accent-red hover:text-canvas-fg"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={clsx('flex-1 space-y-2 p-2.5 transition-colors', isOver && 'bg-accent-yellow/5')}
        style={{ minHeight: 80 }}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCardView key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
