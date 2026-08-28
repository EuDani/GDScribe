import type { InventoryField } from '@/lib/types'
import { Field, Select, TextInput, Textarea } from '@/components/ui/Input'

type ItemData = Record<string, string | number | null>

export function ItemForm({
  fields,
  values,
  onChange,
}: {
  fields: InventoryField[]
  values: ItemData
  onChange: (values: ItemData) => void
}) {
  function set(key: string, value: string | number | null) {
    onChange({ ...values, [key]: value })
  }

  return (
    <div>
      {fields.map((field) => (
        <Field key={field.key} label={field.label || field.key}>
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
              value={values[field.key] ?? ''}
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
          {(field.type === 'text' || field.type === 'image') && (
            <TextInput
              value={(values[field.key] as string) ?? ''}
              onChange={(e) => set(field.key, e.target.value)}
              placeholder={field.type === 'image' ? 'https://…' : undefined}
            />
          )}
        </Field>
      ))}
    </div>
  )
}
