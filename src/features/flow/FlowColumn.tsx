import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { clsx } from 'clsx'
import type { FlowTask, FlowTaskState, ProjectSector } from '@/lib/types'
import { FlowTaskCardView } from '@/features/flow/FlowTaskCard'

export function FlowColumn({
  state,
  label,
  tasks,
  sectors,
  onAddTask,
  onTaskClick,
  onFocusTask,
  onResumeTask,
  className = 'flex-1',
}: {
  state: FlowTaskState
  label: string
  tasks: FlowTask[]
  sectors: ProjectSector[]
  onAddTask?: () => void
  onTaskClick: (task: FlowTask) => void
  onFocusTask: (task: FlowTask) => void
  onResumeTask?: (task: FlowTask) => void
  className?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: state, data: { type: 'column' } })

  return (
    <div
      className={clsx(
        'flex min-h-0 min-w-0 flex-col border-2 bg-surface transition-colors',
        className,
        isOver ? 'border-accent-yellow' : 'border-line',
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b-2 border-line px-3 py-2.5">
        <h3 className="text-label truncate text-xs font-semibold">
          {label} <span className="text-canvas-fg/40">({tasks.length})</span>
        </h3>
        {onAddTask && (
          <button
            type="button"
            onClick={onAddTask}
            aria-label="Nova tarefa"
            className="cursor-pointer border-2 border-line p-1 text-canvas-fg/60 hover:bg-accent-yellow hover:text-ink"
          >
            <Plus size={13} />
          </button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={clsx('min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5 transition-colors', isOver && 'bg-accent-yellow/5')}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <FlowTaskCardView
              key={task.id}
              task={task}
              sectors={sectors}
              onClick={() => onTaskClick(task)}
              onFocus={() => onFocusTask(task)}
              onResume={onResumeTask ? () => onResumeTask(task) : undefined}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="text-label px-1 py-4 text-center text-[11px] text-canvas-fg/30">Vazio</p>
        )}
      </div>
    </div>
  )
}
