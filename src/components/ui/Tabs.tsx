import { clsx } from 'clsx'

export interface TabItem<T extends string> {
  value: T
  label: string
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b-2 border-ink pb-3">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={clsx(
            'text-label cursor-pointer border-2 border-ink px-3 py-1.5 text-xs font-semibold transition-colors',
            value === item.value
              ? 'bg-accent-yellow text-ink shadow-brutal-sm'
              : 'bg-transparent text-paper/70 hover:text-paper',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
