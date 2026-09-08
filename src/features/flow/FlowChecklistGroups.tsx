import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { FlowChecklistGroup } from '@/lib/types'
import { TextInput } from '@/components/ui/Input'
import { ChecklistEditor } from '@/components/ChecklistEditor'

/** Vários checklists nomeados por tarefa (ex: "Móveis", "Instrumentos"), cada um com sua própria lista e progresso. */
export function FlowChecklistGroups({
  groups,
  onChange,
}: {
  groups: FlowChecklistGroup[]
  onChange: (groups: FlowChecklistGroup[]) => void
}) {
  const [newName, setNewName] = useState('')

  function addGroup() {
    if (!newName.trim()) return
    onChange([...groups, { id: crypto.randomUUID(), name: newName.trim(), items: [] }])
    setNewName('')
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.id} className="border-2 border-line/30 p-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <input
              value={group.name}
              onChange={(e) => onChange(groups.map((g) => (g.id === group.id ? { ...g, name: e.target.value } : g)))}
              className="min-w-0 flex-1 border-b-2 border-transparent bg-transparent text-sm font-semibold text-canvas-fg outline-none hover:border-line/30 focus:border-line"
            />
            <button
              type="button"
              onClick={() => onChange(groups.filter((g) => g.id !== group.id))}
              aria-label="Remover checklist"
              className="shrink-0 cursor-pointer border-2 border-line p-1 text-canvas-fg/50 hover:bg-accent-red hover:text-canvas-fg"
            >
              <Trash2 size={12} />
            </button>
          </div>
          <ChecklistEditor
            items={group.items}
            onChange={(items) => onChange(groups.map((g) => (g.id === group.id ? { ...g, items } : g)))}
          />
        </div>
      ))}

      <div className="flex items-center gap-2">
        <TextInput
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addGroup()
            }
          }}
          placeholder="Nome do novo checklist (ex: Móveis, Instrumentos…)"
          className="flex-1"
        />
        <button
          type="button"
          onClick={addGroup}
          aria-label="Novo checklist"
          className="cursor-pointer border-2 border-line p-1.5 text-canvas-fg/60 hover:bg-accent-yellow hover:text-ink"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}
