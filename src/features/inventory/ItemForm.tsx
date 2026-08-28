import type { InventoryField, InventoryValue } from '@/lib/types'
import { Field, Select, TextInput, Textarea } from '@/components/ui/Input'
import { StringListEditor } from '@/components/StringListEditor'

type ItemData = Record<string, InventoryValue>

export function isFieldMissing(field: InventoryField, values: ItemData) {
  if (!field.required) return false
  const value = values[field.key]
  if (Array.isArray(value)) return value.length === 0
  return value === null || value === undefined || value === ''
}

export function getMissingRequiredFields(fields: InventoryField[], values: ItemData) {
  return fields.filter((f) => isFieldMissing(f, values))
}

export function formatInventoryValue(value: InventoryValue) {
  if (Array.isArray(value)) return value.length > 0 ? `${value.length} item(ns)` : '—'
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

export function ItemForm({
  fields,
  values,
  onChange,
  showErrors = false,
}: {
  fields: InventoryField[]
  values: ItemData
  onChange: (values: ItemData) => void
  showErrors?: boolean
}) {
  function set(key: string, value: InventoryValue) {
    onChange({ ...values, [key]: value })
  }

  return (
    <div>
      {fields.map((field) => {
        const missing = showErrors && isFieldMissing(field, values)
        const label = `${field.label || field.key}${field.required ? ' *' : ''}`
        return (
          <Field key={field.key} label={label} error={missing ? 'Campo obrigatório' : undefined}>
            {field.type === 'textarea' && (
              <Textarea
                rows={3}
                value={(values[field.key] as string) ?? ''}
                onChange={(e) => set(field.key, e.target.value)}
              />
            )}
            {field.type === 'number' && (
              <TextInput
                type="number"
                value={(values[field.key] as number) ?? ''}
                onChange={(e) => set(field.key, e.target.value === '' ? null : Number(e.target.value))}
              />
            )}
            {field.type === 'select' && (
              <Select
                value={(values[field.key] as string) ?? ''}
                onChange={(e) => set(field.key, e.target.value)}
              >
                <option value="">—</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            )}
            {field.type === 'list' && (
              <StringListEditor
                items={(values[field.key] as string[]) ?? []}
                onChange={(items) => set(field.key, items)}
                placeholder="Ex: uma fala, um upgrade…"
              />
            )}
            {(field.type === 'text' || field.type === 'image') && (
              <TextInput
                value={(values[field.key] as string) ?? ''}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.type === 'image' ? 'https://…' : undefined}
              />
            )}
          </Field>
        )
      })}
    </div>
  )
}
