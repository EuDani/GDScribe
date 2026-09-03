import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ChecklistItem } from '@/lib/types'
import { TextInput } from '@/components/ui/Input'

export function ChecklistEditor({
  items,
  onChange,
}: {
  items: ChecklistItem[]
  onChange: (items: ChecklistItem[]) => void
}) {
  const [newText, setNewText] = useState('')
  const done = items.filter((i) => i.done).length

  function addItem() {
    if (!newText.trim()) return
    onChange([...items, { id: crypto.randomUUID(), text: newText.trim(), done: false }])
    setNewText('')
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
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.done}
              onChange={(e) =>
                onChange(items.map((i) => (i.id === item.id ? { ...i, done: e.target.checked } : i)))
              }
              className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-accent-green)]"
            />
            <TextInput
              value={item.text}
              onChange={(e) =>
                onChange(items.map((i) => (i.id === item.id ? { ...i, text: e.target.value } : i)))
              }
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((i) => i.id !== item.id))}
              aria-label="Remover item"
              className="cursor-pointer border-2 border-line p-1 text-canvas-fg/50 hover:bg-accent-red hover:text-canvas-fg"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
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
