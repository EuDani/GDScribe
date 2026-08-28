import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Input'

export function StringListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-canvas-fg/40">•</span>
          <TextInput
            value={item}
            onChange={(e) => onChange(items.map((it, idx) => (idx === i ? e.target.value : it)))}
            placeholder={placeholder}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            aria-label="Remover item"
            className="cursor-pointer border-2 border-line p-1 text-canvas-fg/50 hover:bg-accent-red hover:text-canvas-fg"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        icon={<Plus size={12} />}
        onClick={() => onChange([...items, ''])}
      >
        Item
      </Button>
    </div>
  )
}
