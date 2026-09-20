import { clsx } from 'clsx'
import { ICON_MAP, ICON_NAMES } from '@/lib/iconMap'

export function IconPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (value: string | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={clsx(
          'text-label border-2 border-line px-2 py-1.5 text-[10px]',
          !value ? 'bg-accent-yellow text-ink' : 'text-canvas-fg/50 hover:text-canvas-fg',
        )}
      >
        Nenhum
      </button>
      {ICON_NAMES.map((name) => {
        const Icon = ICON_MAP[name]
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            aria-label={name}
            className={clsx(
              'cursor-pointer border-2 border-line p-1.5',
              value === name ? 'bg-accent-yellow text-ink' : 'text-canvas-fg/60 hover:text-canvas-fg',
            )}
          >
            <Icon size={14} />
          </button>
        )
      })}
    </div>
  )
}
