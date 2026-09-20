import { useState } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import type { ChecklistItem } from '@/lib/types'
import { TextInput } from '@/components/ui/Input'
import { useDndSensors } from '@/lib/useDndSensors'

function SortableChecklistRow({
  item,
  onToggle,
  onTextChange,
  onRemove,
}: {
  item: ChecklistItem
  onToggle: (checked: boolean) => void
  onTextChange: (text: string) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Arrastar para reordenar"
        className={`shrink-0 cursor-grab touch-none text-canvas-fg/30 hover:text-canvas-fg/70 active:cursor-grabbing ${isDragging ? 'text-canvas-fg/70' : ''}`}
      >
        <GripVertical size={14} />
      </button>
      <input
        type="checkbox"
        checked={item.done}
        onChange={(e) => onToggle(e.target.checked)}
        className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-accent-green)]"
      />
      <TextInput value={item.text} onChange={(e) => onTextChange(e.target.value)} className="flex-1" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover item"
        className="cursor-pointer border-2 border-line p-1 text-canvas-fg/50 hover:bg-accent-red hover:text-canvas-fg"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

export function ChecklistEditor({
  items,
  onChange,
}: {
  items: ChecklistItem[]
  onChange: (items: ChecklistItem[]) => void
}) {
  const [newText, setNewText] = useState('')
  const done = items.filter((i) => i.done).length
  const sensors = useDndSensors()

  function addItem() {
    if (!newText.trim()) return
    onChange([...items, { id: crypto.randomUUID(), text: newText.trim(), done: false }])
    setNewText('')
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onChange(arrayMove(items, oldIndex, newIndex))
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="mb-2 h-1.5 w-full border border-line/40 bg-canvas">
          <div
            className="h-full bg-accent-green"
            style={{ width: `${(done / items.length) * 100}%` }}
          />
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {items.map((item) => (
              <SortableChecklistRow
                key={item.id}
                item={item}
                onToggle={(checked) => onChange(items.map((i) => (i.id === item.id ? { ...i, done: checked } : i)))}
                onTextChange={(text) => onChange(items.map((i) => (i.id === item.id ? { ...i, text } : i)))}
                onRemove={() => onChange(items.filter((i) => i.id !== item.id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="mt-2 flex items-center gap-2">
        <TextInput
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addItem()
            }
          }}
          placeholder="Novo item da checklist"
          className="flex-1"
        />
        <button
          type="button"
          onClick={addItem}
          aria-label="Adicionar item"
          className="cursor-pointer border-2 border-line p-1.5 text-canvas-fg/60 hover:bg-accent-yellow hover:text-ink"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}
