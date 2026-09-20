import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, CheckSquare, RotateCcw, Target } from 'lucide-react'
import { motion } from 'motion/react'
import { clsx } from 'clsx'
import type { FlowTask, ProjectSector } from '@/lib/types'
import { stripHtml } from '@/lib/html'
import { aggregateChecklistProgress, priorityMeta } from '@/features/flow/flowLogic'

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

export function FlowTaskCardFace({
  task,
  sectors,
  onFocus,
  onResume,
}: {
  task: FlowTask
  sectors: ProjectSector[]
  onFocus?: () => void
  onResume?: () => void
}) {
  const { done: doneCount, total: checklistTotal } = aggregateChecklistProgress(task.checklists)
  const overdue = task.desired_date ? new Date(task.desired_date) < new Date(new Date().toDateString()) : false
  const priority = priorityMeta(task.priority)
  const taskSectors = sectors.filter((s) => task.sectors.includes(s.id))
  const descriptionPreview = task.description ? stripHtml(task.description) : ''

  return (
    <div className="group/card relative p-3">
      <div className="flex items-start gap-1.5">
        <span
          className="mt-1 h-2 w-2 shrink-0 border border-line"
          style={{ backgroundColor: priority.color }}
          title={priority.label}
        />
        <p className="text-sm font-semibold">{task.title}</p>
      </div>
      {descriptionPreview && <p className="mt-1 line-clamp-2 text-xs text-ink/60">{descriptionPreview}</p>}

      {(checklistTotal > 0 || task.desired_date) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink/60">
          {checklistTotal > 0 && (
            <span className="flex items-center gap-1">
              <CheckSquare size={12} />
              {doneCount}/{checklistTotal}
            </span>
          )}
          {task.desired_date && (
            <span className={clsx('flex items-center gap-1', overdue && 'text-accent-red')}>
              <CalendarDays size={12} />
              {formatDate(task.desired_date)}
            </span>
          )}
        </div>
      )}

      {taskSectors.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {taskSectors.map((s) => (
            <span
              key={s.id}
              className="text-label border border-line px-1.5 py-0.5 text-[10px] text-ink"
              style={{ backgroundColor: s.color }}
            >
              {s.name}
            </span>
          ))}
        </div>
      )}

      <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover/card:opacity-100">
        {onResume && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onResume()
            }}
            aria-label="Voltar para a fila"
            title="Voltar para a fila"
            className="cursor-pointer border-2 border-line bg-paper p-1 text-ink shadow-brutal-sm hover:bg-accent-blue"
          >
            <RotateCcw size={13} />
          </button>
        )}
        {onFocus && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onFocus()
            }}
            aria-label="Focar nessa tarefa"
            title="Focar nessa tarefa"
            className="cursor-pointer border-2 border-line bg-paper p-1 text-ink shadow-brutal-sm hover:bg-accent-yellow"
          >
            <Target size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

export function FlowTaskCardView({
  task,
  sectors,
  onClick,
  onFocus,
  onResume,
}: {
  task: FlowTask
  sectors: ProjectSector[]
  onClick: () => void
  onFocus: () => void
  onResume?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', state: task.state },
    transition: { duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-grab touch-none active:cursor-grabbing"
    >
      <motion.div
        animate={{ scale: isDragging ? 1.04 : 1, opacity: isDragging ? 0.5 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="overflow-hidden border-2 border-line bg-paper text-ink shadow-brutal-sm"
      >
        <FlowTaskCardFace task={task} sectors={sectors} onFocus={onFocus} onResume={onResume} />
      </motion.div>
    </div>
  )
}
