import { Plus, Trash2 } from 'lucide-react'
import { NOTIFICATION_UNITS, type NotificationRule } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Select, TextInput } from '@/components/ui/Input'

export function NotificationRulesEditor({
  rules,
  onChange,
}: {
  rules: NotificationRule[]
  onChange: (rules: NotificationRule[]) => void
}) {
  function update(index: number, changes: Partial<NotificationRule>) {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...changes } : r)))
  }

  function addRule() {
    onChange([...rules, { id: crypto.randomUUID(), kind: 'before', amount: 1, unit: 'days', time: null }])
  }

  return (
    <div className="space-y-2">
      {rules.map((rule, i) => (
        <div key={rule.id} className="flex flex-wrap items-center gap-2 border-2 border-line/40 p-2.5">
          <Select
            value={rule.kind}
            onChange={(e) =>
              update(i, {
                kind: e.target.value as NotificationRule['kind'],
                amount: e.target.value === 'before' ? (rule.amount ?? 1) : null,
                unit: e.target.value === 'before' ? (rule.unit ?? 'days') : null,
                time: e.target.value === 'same_day_at' ? (rule.time ?? '09:00') : null,
              })
            }
            className="w-auto"
          >
            <option value="before">Antes do evento</option>
            <option value="same_day_at">No dia, em horário específico</option>
          </Select>

          {rule.kind === 'before' ? (
            <>
              <TextInput
                type="number"
                min={1}
                value={rule.amount ?? 1}
                onChange={(e) => update(i, { amount: Number(e.target.value) })}
                className="w-16"
              />
              <Select
                value={rule.unit ?? 'days'}
                onChange={(e) => update(i, { unit: e.target.value as NotificationRule['unit'] })}
                className="w-auto"
              >
                {NOTIFICATION_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Select>
              <span className="text-xs text-canvas-fg/50">antes</span>
            </>
          ) : (
            <TextInput
              type="time"
              value={rule.time ?? '09:00'}
              onChange={(e) => update(i, { time: e.target.value })}
              className="w-auto"
            />
          )}

          <button
            type="button"
            onClick={() => onChange(rules.filter((_, idx) => idx !== i))}
            aria-label="Remover notificação"
            className="ml-auto cursor-pointer border-2 border-line p-1.5 text-canvas-fg/50 hover:bg-accent-red hover:text-canvas-fg"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" icon={<Plus size={13} />} onClick={addRule}>
        Adicionar notificação
      </Button>
    </div>
  )
}
