import { useEffect, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Pause, Pencil, Target, Timer, X } from 'lucide-react'
import { clsx } from 'clsx'
import { motion } from 'motion/react'
import type { FlowTask, ProjectSector } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Input'
import { computeForecastDate, formatDuration, formatLogTimestamp, liveTimeSpent, priorityMeta } from '@/features/flow/flowLogic'

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

export function FlowFocusPanel({
  task,
  sectors,
  onToggleChecklistItem,
  onAddNote,
  onAddDecision,
  onPause,
  onComplete,
  onCancel,
  onEdit,
}: {
  task: FlowTask | null
  sectors: ProjectSector[]
  onToggleChecklistItem: (itemId: string) => void
  onAddNote: (text: string) => void
  onAddDecision: (text: string) => void
  onPause: () => void
  onComplete: (force: boolean) => void
  onCancel: () => void
  onEdit: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'focus', data: { type: 'focus-zone' } })
  const [, forceTick] = useState(0)
  const [logsOpen, setLogsOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [decisionText, setDecisionText] = useState('')
  const [confirmingForce, setConfirmingForce] = useState(false)

  useEffect(() => {
    if (task?.state !== 'focus') return
    const id = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [task?.state])

  if (!task) {
    return (
      <div
        ref={setNodeRef}
        className={clsx(
          'flex min-h-[220px] flex-1 flex-col items-center justify-center gap-2 border-2 border-dashed p-8 text-center transition-colors',
          isOver ? 'border-accent-yellow bg-accent-yellow/10' : 'border-line/40',
        )}
      >
        <Target size={28} className="text-canvas-fg/30" />
        <p className="text-display text-lg text-canvas-fg/50">FOCO</p>
        <p className="text-sm text-canvas-fg/40">Arraste uma tarefa da fila até aqui, ou clique no alvo de um card.</p>
      </div>
    )
  }

  const doneCount = task.checklist.filter((i) => i.done).length
  const total = task.checklist.length
  const pending = total - doneCount
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0
  const seconds = liveTimeSpent(task)
  const forecast = computeForecastDate(task)
  const priority = priorityMeta(task.priority)
  const taskSectors = sectors.filter((s) => task.sectors.includes(s.id))
  const overdue = task.desired_date ? new Date(task.desired_date) < new Date(new Date().toDateString()) : false
  const forecastLate = forecast && task.desired_date ? forecast > task.desired_date : false

  return (
    <div ref={setNodeRef} className={clsx('flex-1 border-2 bg-surface transition-colors', isOver ? 'border-accent-yellow' : 'border-line')}>
      <div className="flex items-center justify-between gap-2 border-b-2 border-line px-4 py-2.5" style={{ boxShadow: `inset 4px 0 0 0 ${priority.color}` }}>
        <div className="flex items-center gap-2">
          <Target size={14} className="text-canvas-fg/50" />
          <h3 className="text-label text-xs font-semibold text-canvas-fg/60">FOCO</h3>
          <span className="text-label border border-line/40 px-1.5 py-0.5 text-[10px] text-canvas-fg/50">{task.version_label}</span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Editar tarefa"
          className="cursor-pointer border-2 border-line p-1 text-canvas-fg/60 hover:bg-accent-blue hover:text-ink"
        >
          <Pencil size={13} />
        </button>
      </div>

      <div className="p-4">
        <p className="text-display text-xl">{task.title}</p>
        {task.description && <p className="mt-1.5 text-sm text-canvas-fg/60">{task.description}</p>}

        {taskSectors.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {taskSectors.map((s) => (
              <span key={s.id} className="text-label border border-line px-1.5 py-0.5 text-[10px] text-ink" style={{ backgroundColor: s.color }}>
                {s.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-canvas-fg/70">
          <span className="flex items-center gap-1.5">
            <Timer size={14} />
            {formatDuration(seconds)}
          </span>
          {task.desired_date && (
            <span className={clsx('flex items-center gap-1.5', overdue && 'text-accent-red')}>
              <CalendarDays size={14} />
              Desejado: {formatDate(task.desired_date)}
            </span>
          )}
          {forecast && (
            <span className={clsx('flex items-center gap-1.5', forecastLate ? 'text-accent-red' : 'text-accent-green')}>
              Previsão: {formatDate(forecast)} {forecastLate ? '(depois do desejado)' : task.desired_date ? '(antes do desejado)' : ''}
            </span>
          )}
        </div>

        {total > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-canvas-fg/60">
              <span>
                ☑ {doneCount}/{total}
              </span>
              <span>{percent}%</span>
            </div>
            <div className="h-3 w-full border-2 border-line bg-canvas">
              <motion.div
                className="h-full bg-accent-green"
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              />
            </div>
            <div className="mt-2 space-y-1">
              {task.checklist.map((item) => (
                <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => onToggleChecklistItem(item.id)}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-accent-green)]"
                  />
                  <span className={clsx(item.done && 'text-canvas-fg/40 line-through')}>{item.text}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-label mb-1 text-[10px] text-canvas-fg/40">Observação rápida</p>
            <div className="flex gap-1.5">
              <TextInput
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && noteText.trim()) {
                    onAddNote(noteText.trim())
                    setNoteText('')
                  }
                }}
                placeholder="Anotar algo…"
                className="flex-1 text-xs"
              />
            </div>
            {task.notes.length > 0 && (
              <ul className="mt-1.5 space-y-1 text-xs text-canvas-fg/60">
                {task.notes
                  .slice(-3)
                  .reverse()
                  .map((n) => (
                    <li key={n.id}>• {n.text}</li>
                  ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-label mb-1 text-[10px] text-canvas-fg/40">Decisão importante</p>
            <div className="flex gap-1.5">
              <TextInput
                value={decisionText}
                onChange={(e) => setDecisionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && decisionText.trim()) {
                    onAddDecision(decisionText.trim())
                    setDecisionText('')
                  }
                }}
                placeholder="Registrar decisão…"
                className="flex-1 text-xs"
              />
            </div>
            {task.decisions.length > 0 && (
              <ul className="mt-1.5 space-y-1 text-xs text-canvas-fg/60">
                {task.decisions
                  .slice(-3)
                  .reverse()
                  .map((d) => (
                    <li key={d.id}>• {d.text}</li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t-2 border-line pt-4">
          <button
            type="button"
            onClick={() => setLogsOpen((v) => !v)}
            className="text-label flex items-center gap-1 text-[11px] text-canvas-fg/40 hover:text-canvas-fg"
          >
            {logsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Histórico ({task.logs.length})
          </button>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" icon={<Pause size={13} />} onClick={onPause}>
              Pausar
            </Button>
            <Button size="sm" variant="danger" icon={<X size={13} />} onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="accent"
              icon={<CheckCircle2 size={13} />}
              onClick={() => (pending > 0 ? setConfirmingForce(true) : onComplete(false))}
            >
              Concluir
            </Button>
          </div>
        </div>

        {logsOpen && (
          <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto border-t border-line/30 pt-3 text-xs text-canvas-fg/60">
            {[...task.logs].reverse().map((log) => (
              <div key={log.id} className="flex gap-2">
                <span className="shrink-0 text-canvas-fg/30">{formatLogTimestamp(log.created_at)}</span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        )}

        {confirmingForce && (
          <div className="mt-3 border-2 border-accent-red bg-accent-red/10 p-3 text-center">
            <p className="text-sm font-semibold">Ainda existem {pending} {pending === 1 ? 'item pendente' : 'itens pendentes'}.</p>
            <div className="mt-2 flex justify-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirmingForce(false)}>
                Voltar
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  setConfirmingForce(false)
                  onComplete(true)
                }}
              >
                Concluir mesmo assim
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
