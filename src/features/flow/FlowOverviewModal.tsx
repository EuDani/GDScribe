import { ArrowRightCircle, Target } from 'lucide-react'
import { clsx } from 'clsx'
import type { FlowTask, FlowTaskState } from '@/lib/types'
import { Modal } from '@/components/ui/Modal'
import { priorityMeta, STATE_LABELS } from '@/features/flow/flowLogic'

const GROUPS: FlowTaskState[] = ['backlog', 'paused', 'queued', 'done', 'cancelled']

function formatShortDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

export function FlowOverviewModal({
  open,
  onClose,
  tasks,
  onTaskClick,
  onFocusTask,
  onSendToQueue,
}: {
  open: boolean
  onClose: () => void
  tasks: FlowTask[]
  onTaskClick: (task: FlowTask) => void
  onFocusTask: (task: FlowTask) => void
  onSendToQueue: (task: FlowTask) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Backlog — visão geral" wide>
      <div className="max-h-[70vh] space-y-5 overflow-y-auto">
        {tasks.length === 0 && <p className="text-sm text-canvas-fg/50">Nenhuma tarefa fora do trabalho ativo.</p>}
        {GROUPS.map((state) => {
          const list = tasks
            .filter((t) => t.state === state)
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          if (list.length === 0) return null
          return (
            <div key={state}>
              <h4 className="text-label mb-2 text-xs font-semibold text-canvas-fg/50">
                {STATE_LABELS[state]} ({list.length})
              </h4>
              <div className="space-y-1.5">
                {list.map((t) => {
                  const priority = priorityMeta(t.priority)
                  const dateLabel =
                    state === 'done'
                      ? t.completed_at && formatShortDate(t.completed_at.slice(0, 10))
                      : state === 'cancelled'
                        ? t.cancelled_at && formatShortDate(t.cancelled_at.slice(0, 10))
                        : null
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-2 border-2 border-line/30 bg-surface px-3 py-2 text-sm"
                    >
                      <button type="button" onClick={() => onTaskClick(t)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <span className="h-2 w-2 shrink-0 border border-line" style={{ backgroundColor: priority.color }} />
                        <span className={clsx('truncate', state === 'cancelled' && 'text-canvas-fg/50 line-through')}>{t.title}</span>
                        {dateLabel && <span className="text-label shrink-0 text-[10px] text-canvas-fg/40">{dateLabel}</span>}
                      </button>
                      <div className="flex shrink-0 gap-1">
                        {(state === 'backlog' || state === 'paused') && (
                          <button
                            type="button"
                            onClick={() => onSendToQueue(t)}
                            aria-label="Mover para a fila"
                            title="Mover para a fila"
                            className="cursor-pointer border-2 border-line p-1 text-canvas-fg/60 hover:bg-accent-blue hover:text-ink"
                          >
                            <ArrowRightCircle size={13} />
                          </button>
                        )}
                        {state !== 'done' && state !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => onFocusTask(t)}
                            aria-label="Focar"
                            title="Focar"
                            className="cursor-pointer border-2 border-line p-1 text-canvas-fg/60 hover:bg-accent-yellow hover:text-ink"
                          >
                            <Target size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
