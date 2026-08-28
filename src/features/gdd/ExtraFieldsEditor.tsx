import { Plus, Trash2 } from 'lucide-react'
import type { ChartPoint, ExtraField, ExtraFieldType } from '@/lib/types'
import { Select, TextInput } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MiniBarChart } from '@/components/MiniBarChart'

const TYPE_LABELS: Record<ExtraFieldType, string> = {
  text: 'Texto',
  number: 'Número',
  list: 'Lista',
  chart: 'Gráfico',
}

function defaultValueFor(type: ExtraFieldType): ExtraField['value'] {
  if (type === 'number') return 0
  if (type === 'list') return []
  if (type === 'chart') return []
  return ''
}

export function ExtraFieldsEditor({
  fields,
  onChange,
}: {
  fields: ExtraField[]
  onChange: (fields: ExtraField[]) => void
}) {
  function update(index: number, changes: Partial<ExtraField>) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...changes } : f)))
  }

  function addField() {
    onChange([
      ...fields,
      { id: crypto.randomUUID(), label: '', type: 'text', value: defaultValueFor('text') },
    ])
  }

  function removeField(index: number) {
    onChange(fields.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {fields.map((field, i) => (
        <div key={field.id} className="border-2 border-line/40 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <TextInput
              value={field.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Nome do campo (ex: Inimigos por bioma)"
              className="min-w-[160px] flex-1"
            />
            <Select
              value={field.type}
              onChange={(e) => {
                const type = e.target.value as ExtraFieldType
                update(i, { type, value: defaultValueFor(type) })
              }}
              className="w-auto"
            >
              {(Object.keys(TYPE_LABELS) as ExtraFieldType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => removeField(i)}
              aria-label="Remover campo"
              className="cursor-pointer border-2 border-line p-1.5 text-canvas-fg/60 hover:bg-accent-red hover:text-canvas-fg"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {field.type === 'text' && (
            <TextInput
              value={(field.value as string) ?? ''}
              onChange={(e) => update(i, { value: e.target.value })}
            />
          )}

          {field.type === 'number' && (
            <TextInput
              type="number"
              value={(field.value as number) ?? 0}
              onChange={(e) => update(i, { value: Number(e.target.value) })}
            />
          )}

          {field.type === 'list' && (
            <ListValueEditor
              items={(field.value as string[]) ?? []}
              onChange={(items) => update(i, { value: items })}
            />
          )}

          {field.type === 'chart' && (
            <ChartValueEditor
              points={(field.value as ChartPoint[]) ?? []}
              onChange={(points) => update(i, { value: points })}
            />
          )}
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" icon={<Plus size={14} />} onClick={addField}>
        Adicionar campo
      </Button>
    </div>
  )
}

function ListValueEditor({
  items,
  onChange,
}: {
  items: string[]
  onChange: (items: string[]) => void
}) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-canvas-fg/40">•</span>
          <TextInput
            value={item}
            onChange={(e) => onChange(items.map((it, idx) => (idx === i ? e.target.value : it)))}
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

function ChartValueEditor({
  points,
  onChange,
}: {
  points: ChartPoint[]
  onChange: (points: ChartPoint[]) => void
}) {
  return (
    <div className="space-y-2">
      {points.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <TextInput
            value={p.label}
            onChange={(e) =>
              onChange(points.map((pt, idx) => (idx === i ? { ...pt, label: e.target.value } : pt)))
            }
            placeholder="Categoria"
            className="flex-1"
          />
          <TextInput
            type="number"
            value={p.value}
            onChange={(e) =>
              onChange(
                points.map((pt, idx) => (idx === i ? { ...pt, value: Number(e.target.value) } : pt)),
              )
            }
            className="w-24"
          />
          <button
            type="button"
            onClick={() => onChange(points.filter((_, idx) => idx !== i))}
            aria-label="Remover ponto"
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
        onClick={() => onChange([...points, { label: '', value: 0 }])}
      >
        Ponto
      </Button>
      {points.length > 0 && (
        <div className="pt-1">
          <MiniBarChart points={points} />
        </div>
      )}
    </div>
  )
}
