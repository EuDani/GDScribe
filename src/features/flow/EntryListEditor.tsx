import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { FlowNoteEntry } from '@/lib/types'
import { TextInput } from '@/components/ui/Input'

/** Lista append-able de observações/decisões — usada tanto no modal quanto no painel de foco. */
export function EntryListEditor({
  placeholder,
  items,
  onChange,
}: {
  placeholder: string
  items: FlowNoteEntry[]
  onChange: (items: FlowNoteEntry[]) => void
}) {
  const [text, setText] = useState('')

  function add() {
    if (!text.trim()) return
    onChange([...items, { id: crypto.randomUUID(), text: text.trim(), created_at: new Date().toISOString() }])
    setText('')
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="mb-1.5 space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-2 border-2 border-line/30 bg-canvas px-2 py-1.5 text-xs">
              <span className="flex-1">{item.text}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                aria-label="Remover"
                className="shrink-0 cursor-pointer text-canvas-fg/40 hover:text-accent-red"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <TextInput
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="flex-1"
        />
        <button
          type="button"
          onClick={add}
          aria-label="Adicionar"
          className="cursor-pointer border-2 border-line p-1.5 text-canvas-fg/60 hover:bg-accent-yellow hover:text-ink"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}
