import { motion } from 'motion/react'
import type { ChartPoint } from '@/lib/types'

const DEFAULT_COLORS = [
  'var(--color-accent-red)',
  'var(--color-accent-blue)',
  'var(--color-accent-yellow)',
  'var(--color-accent-green)',
  'var(--color-accent-purple)',
]

export function MiniBarChart({ points, colors }: { points: ChartPoint[]; colors?: string[] }) {
  const max = Math.max(1, ...points.map((p) => Math.abs(p.value)))
  const palette = colors && colors.length > 0 ? colors : DEFAULT_COLORS

  return (
    <div className="space-y-1.5">
      {points.map((p, i) => (
        <div key={`${p.label}-${i}`} className="flex items-center gap-2 text-xs">
          <span className="w-24 shrink-0 truncate text-canvas-fg/70">{p.label || '—'}</span>
          <div className="h-4 flex-1 border border-line/40 bg-canvas">
            <motion.div
              className="h-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (Math.abs(p.value) / max) * 100)}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ backgroundColor: palette[i % palette.length] }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-canvas-fg/60">{p.value}</span>
        </div>
      ))}
    </div>
  )
}
