import type { ChartPoint } from '@/lib/types'

const BAR_COLORS = [
  'var(--color-accent-red)',
  'var(--color-accent-blue)',
  'var(--color-accent-yellow)',
  'var(--color-accent-green)',
  'var(--color-accent-purple)',
]

export function MiniBarChart({ points }: { points: ChartPoint[] }) {
  const max = Math.max(1, ...points.map((p) => Math.abs(p.value)))

  return (
    <div className="space-y-1.5">
      {points.map((p, i) => (
        <div key={`${p.label}-${i}`} className="flex items-center gap-2 text-xs">
          <span className="w-24 shrink-0 truncate text-canvas-fg/70">{p.label || '—'}</span>
          <div className="h-4 flex-1 border border-line/40 bg-canvas">
            <div
              className="h-full"
              style={{
                width: `${Math.min(100, (Math.abs(p.value) / max) * 100)}%`,
                backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
              }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-canvas-fg/60">{p.value}</span>
        </div>
      ))}
    </div>
  )
}
