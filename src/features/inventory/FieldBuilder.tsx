import { Plus, Trash2 } from 'lucide-react'
import type { FieldType, InventoryField } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Select, TextInput } from '@/components/ui/Input'

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Texto curto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Lista de opções' },
  { value: 'image', label: 'Imagem (URL)' },
]

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '')
}

export function FieldBuilder({
  fields,
  onChange,
}: {
  fields: InventoryField[]
  onChange: (fields: InventoryField[]) => void
}) {
  function updateField(index: number, changes: Partial<InventoryField>) {
    const next = fields.map((f, i) => (i === index ? { ...f, ...changes } : f))
    onChange(next)
  }

  function addField() {
    onChange([...fields, { key: `campo_${fields.length + 1}`, label: '', type: 'text' }])
  }

  function removeField(index: number) {
    onChange(fields.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2.5">
      {fields.map((field, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 border-2 border-line/40 p-2.5">
          <TextInput
            value={field.label}
            onChange={(e) =>
              updateField(i, {
                label: e.target.value,
                key: field.key.startsWith('campo_') ? slugify(e.target.value) : field.key,
              })
            }
            placeholder="Nome do campo (ex: Vida)"
            className="min-w-[140px] flex-1"
          />
          <Select
            value={field.type}
            onChange={(e) => updateField(i, { type: e.target.value as FieldType })}
            className="w-auto"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          {field.type === 'select' && (
            <TextInput
              value={field.options?.join(', ') ?? ''}
              onChange={(e) =>
                updateField(i, {
                  options: e.target.value
                    .split(',')
                    .map((o) => o.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Opções separadas por vírgula"
              className="min-w-[160px] flex-1"
            />
          )}
          <button
            type="button"
            onClick={() => removeField(i)}
            aria-label="Remover campo"
            className="cursor-pointer border-2 border-line p-1.5 text-canvas-fg/60 hover:bg-accent-red hover:text-canvas-fg"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" icon={<Plus size={14} />} onClick={addField}>
        Adicionar campo
      </Button>
    </div>
  )
}
