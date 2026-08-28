import { Select } from '@/components/ui/Input'
import { useKanbanColumns } from '@/features/kanban/useKanban'

export function StatusSelect({
  projectId,
  value,
  onChange,
  className,
}: {
  projectId: string
  value: string | null
  onChange: (value: string | null) => void
  className?: string
}) {
  const { data: columns } = useKanbanColumns(projectId)

  return (
    <Select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={className}
    >
      <option value="">Sem status</option>
      {columns?.map((c) => (
        <option key={c.id} value={c.name}>
          {c.name}
        </option>
      ))}
    </Select>
  )
}

export function StatusBadge({ projectId, value }: { projectId: string; value: string | null }) {
  const { data: columns } = useKanbanColumns(projectId)
  if (!value) return null
  const column = columns?.find((c) => c.name === value)

  return (
    <span
      className="text-label border-2 border-line px-2 py-0.5 text-[10px] text-ink"
      style={{ backgroundColor: column?.color ?? 'var(--color-paper-dim)' }}
    >
      {value}
    </span>
  )
}
