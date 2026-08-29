import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { clsx } from 'clsx'
import type { InventoryItem, InventoryType, KanbanColumn } from '@/lib/types'
import { formatInventoryValue } from '@/features/inventory/ItemForm'
import { useAllKanbanColumns } from '@/features/kanban/useKanban'
import { useUpsertInventoryItem } from '@/features/inventory/useInventory'

const UNSORTED = '__unsorted__'

function ItemCard({ item, type, onClick }: { item: InventoryItem; type: InventoryType; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const primary = type.fields_schema[0]
  const title = primary ? formatInventoryValue(item.data[primary.key]) || 'Sem título' : 'Item'

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.3 : 1,
      }}
      className="cursor-grab touch-none border-2 border-line bg-paper p-2.5 text-ink shadow-brutal-sm active:cursor-grabbing"
    >
      <p className="truncate text-xs font-semibold">{title}</p>
      {type.fields_schema[1] && (
        <p className="mt-0.5 truncate text-[11px] text-ink/60">{formatInventoryValue(item.data[type.fields_schema[1].key])}</p>
      )}
    </div>
  )
}

function StatusColumn({
  id,
  name,
  color,
  items,
  type,
  onItemClick,
}: {
  id: string
  name: string
  color?: string
  items: InventoryItem[]
  type: InventoryType
  onItemClick: (item: InventoryItem) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      className={clsx(
        'flex w-64 shrink-0 flex-col border-2 bg-surface transition-colors',
        isOver ? 'border-accent-yellow' : 'border-line',
      )}
    >
      <div className="border-b-2 border-line px-3 py-2" style={{ boxShadow: color ? `inset 4px 0 0 0 ${color}` : undefined }}>
        <h3 className="text-label text-xs font-semibold">
          {name} <span className="text-canvas-fg/40">({items.length})</span>
        </h3>
      </div>
      <div ref={setNodeRef} className={clsx('flex-1 space-y-2 p-2.5', isOver && 'bg-accent-yellow/5')} style={{ minHeight: 80 }}>
        {items.map((item) => (
          <ItemCard key={item.id} item={item} type={type} onClick={() => onItemClick(item)} />
        ))}
      </div>
    </div>
  )
}

export function InventoryKanbanView({
  projectId,
  type,
  items,
  onItemClick,
}: {
  projectId: string
  type: InventoryType
  items: InventoryItem[]
  onItemClick: (item: InventoryItem) => void
}) {
  const { data: kanbanColumns } = useAllKanbanColumns(projectId)
  const upsertItem = useUpsertInventoryItem(projectId, type.id)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null)

  const statusNames = Array.from(new Set((kanbanColumns ?? []).map((c) => c.name)))
  const colorFor = (name: string) => (kanbanColumns ?? []).find((c: KanbanColumn) => c.name === name)?.color

  function itemsFor(status: string) {
    if (status === UNSORTED) return items.filter((i) => !i.status)
    return items.filter((i) => i.status === status)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveItem(items.find((i) => i.id === event.active.id) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null)
    const { active, over } = event
    if (!over) return
    const item = items.find((i) => i.id === active.id)
    if (!item) return
    const newStatus = over.id === UNSORTED ? null : (over.id as string)
    if (newStatus === item.status) return
    upsertItem.mutate({ id: item.id, data: item.data, status: newStatus })
  }

  if (statusNames.length === 0) {
    return (
      <p className="text-xs text-canvas-fg/40">
        Crie colunas no Kanban do projeto para poder organizar os itens por status aqui.
      </p>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        <StatusColumn id={UNSORTED} name="Sem status" items={itemsFor(UNSORTED)} type={type} onItemClick={onItemClick} />
        {statusNames.map((name) => (
          <StatusColumn key={name} id={name} name={name} color={colorFor(name)} items={itemsFor(name)} type={type} onItemClick={onItemClick} />
        ))}
      </div>
      <DragOverlay>
        {activeItem && (
          <div className="w-64 rotate-1 border-2 border-line bg-paper p-2.5 text-ink shadow-brutal-lg">
            <p className="truncate text-xs font-semibold">
              {type.fields_schema[0] ? formatInventoryValue(activeItem.data[type.fields_schema[0].key]) : 'Item'}
            </p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
