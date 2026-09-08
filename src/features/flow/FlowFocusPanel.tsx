import { useEffect, useRef, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { CheckCircle2, GitBranch, Maximize2, Minimize2, Pause, Target, Timer, Trash2, X } from 'lucide-react'
import { clsx } from 'clsx'
import type { FlowPriority, FlowTask, ProjectSector } from '@/lib/types'
import { FLOW_PRIORITIES } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Select, TextInput } from '@/components/ui/Input'
import { SectorPicker } from '@/components/SectorPicker'
import { RichTextEditor } from '@/components/RichTextEditor'
import { EntryListEditor } from '@/features/flow/EntryListEditor'
import { FlowChecklistGroups } from '@/features/flow/FlowChecklistGroups'
import {
  aggregateChecklistProgress,
  computeForecastDate,
  formatDuration,
  formatLogTimestamp,
  liveTimeSpent,
  priorityMeta,
} from '@/features/flow/flowLogic'

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

function SectionHeader({ label }: { label: string }) {
  return <h4 className="text-label mb-2 mt-5 border-b-2 border-line/30 pb-1 text-xs font-semibold text-canvas-fg/50">{label}</h4>
}

const editableFieldClasses =
  'w-full border-b-2 border-transparent bg-transparent text-canvas-fg outline-none transition-colors hover:border-line/20 focus:border-line'

export function FlowFocusPanel({
  task,
  sectors,
  projectId,
  expanded,
  onToggleExpand,
  onCommit,
  onBumpVersion,
  onPause,
  onComplete,
  onCancel,
  onDelete,
}: {
  task: FlowTask | null
  sectors: ProjectSector[]
  projectId: string
  expanded: boolean
  onToggleExpand: () => void
  onCommit: (fields: Partial<FlowTask>) => void
  onBumpVersion: () => void
  onPause: () => void
  onComplete: (force: boolean) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'focus', data: { type: 'focus-zone' } })
  const [, forceTick] = useState(0)
  const [confirmingForce, setConfirmingForce] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const lastTaskId = useRef<string | null>(null)

  // Só ressincroniza o rascunho quando abre uma tarefa DIFERENTE — usar o
  // objeto inteiro como dependência faz o formulário se resetar sozinho a
  // cada refetch em segundo plano (ex: o polling do cronômetro), perdendo o
  // que o usuário tinha acabado de digitar.
  useEffect(() => {
    if (!task) {
      lastTaskId.current = null
      return
    }
    if (task.id === lastTaskId.current) return
    lastTaskId.current = task.id
    setDraftTitle(task.title)
    setDraftDescription(task.description ?? '')
  }, [task])

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
          'flex h-full min-h-[220px] flex-col items-center justify-center gap-2 border-2 border-dashed p-8 text-center transition-colors',
          isOver ? 'border-accent-yellow bg-accent-yellow/10' : 'border-line/40',
        )}
      >
        <Target size={28} className="text-canvas-fg/30" />
        <p className="text-display text-lg text-canvas-fg/50">FOCO</p>
        <p className="text-sm text-canvas-fg/40">Arraste uma tarefa até aqui, ou clique no alvo de um card.</p>
      </div>
    )
  }

  const { done: doneCount, total } = aggregateChecklistProgress(task.checklists)
  const pending = total - doneCount
  const seconds = liveTimeSpent(task)
  const forecast = computeForecastDate(task)
  const priority = priorityMeta(task.priority)
  const forecastLate = forecast && task.desired_date ? forecast > task.desired_date : false

  function commitTitle() {
    if (!task) return
    if (draftTitle.trim() && draftTitle !== task.title) onCommit({ title: draftTitle.trim() })
    else setDraftTitle(task.title)
  }

  function commitDescription() {
    if (!task) return
    if (draftDescription !== (task.description ?? '')) onCommit({ description: draftDescription.trim() || null })
  }

  return (
    <div
      ref={setNodeRef}
      className={clsx('flex h-full flex-col border-2 bg-surface transition-colors', isOver ? 'border-accent-yellow' : 'border-line')}
    >
      <div
        className="flex items-center justify-between gap-2 border-b-2 border-line px-4 py-2.5"
        style={{ boxShadow: `inset 4px 0 0 0 ${priority.color}` }}
      >
        <div className="flex items-center gap-2">
          <Target size={14} className="text-canvas-fg/50" />
          <h3 className="text-label text-xs font-semibold text-canvas-fg/60">FOCO</h3>
          <span className="text-label border border-line/30 px-1.5 py-0.5 text-[10px] text-canvas-fg/60">{task.version_label}</span>
          <button
            type="button"
            onClick={onBumpVersion}
            title="Nova versão — arquiva a atual no backlog"
            className="cursor-pointer border-2 border-line p-1 text-canvas-fg/60 hover:bg-accent-yellow hover:text-ink"
          >
            <GitBranch size={12} />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onPause}
            title="Pausar"
            className="cursor-pointer border-2 border-line p-1 text-canvas-fg/60 hover:bg-accent-blue hover:text-ink"
          >
            <Pause size={13} />
          </button>
          <button
            type="button"
            onClick={onCancel}
            title="Cancelar tarefa"
            className="cursor-pointer border-2 border-line p-1 text-canvas-fg/60 hover:bg-accent-red hover:text-canvas-fg"
          >
            <X size={13} />
          </button>
          <button
            type="button"
            onClick={() => (pending > 0 ? setConfirmingForce(true) : onComplete(false))}
            title="Concluir"
            className="cursor-pointer border-2 border-line p-1 text-canvas-fg/60 hover:bg-accent-green hover:text-ink"
          >
            <CheckCircle2 size={13} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Excluir"
            className="cursor-pointer border-2 border-line p-1 text-canvas-fg/60 hover:bg-accent-red hover:text-canvas-fg"
          >
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            title={expanded ? 'Sair da tela cheia' : 'Ver só a tarefa em foco'}
            className="cursor-pointer border-2 border-line p-1 text-canvas-fg/60 hover:bg-accent-blue hover:text-ink"
          >
            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className={clsx(editableFieldClasses, 'text-display text-xl')}
        />

        <SectionHeader label="Descrição" />
        <div onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && commitDescription()}>
          <RichTextEditor projectId={projectId} value={draftDescription} onChange={setDraftDescription} placeholder="Sem descrição — clique para adicionar" minHeight={100} />
        </div>

        <SectionHeader label="Prioridade" />
        <Select value={task.priority} onChange={(e) => onCommit({ priority: e.target.value as FlowPriority })} className="max-w-[200px]">
          {FLOW_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.dot} {p.label}
            </option>
          ))}
        </Select>

        <SectionHeader label="Setores" />
        <SectorPicker value={task.sectors} onChange={(s) => onCommit({ sectors: s })} sectors={sectors} />

        <SectionHeader label="Datas" />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-label mb-1 block text-[10px] text-canvas-fg/40">Início</span>
            <TextInput type="date" value={task.start_date ?? ''} onChange={(e) => onCommit({ start_date: e.target.value || null })} />
          </label>
          <label className="block">
            <span className="text-label mb-1 block text-[10px] text-canvas-fg/40">Fim</span>
            <TextInput type="date" value={task.desired_date ?? ''} onChange={(e) => onCommit({ desired_date: e.target.value || null })} />
          </label>
        </div>
        {forecast && (
          <p className={clsx('mt-2 text-xs', forecastLate ? 'text-accent-red' : 'text-accent-green')}>
            Previsão de conclusão: {formatDate(forecast)}
            {task.desired_date ? (forecastLate ? ' (depois do desejado)' : ' (antes do desejado)') : ''}
          </p>
        )}

        <SectionHeader label="Tempo" />
        <p className="flex items-center gap-1.5 text-sm text-canvas-fg/80">
          <Timer size={14} />
          {formatDuration(seconds)}
        </p>

        <SectionHeader label="Checklists" />
        {total > 0 && (
          <p className="mb-2 text-xs text-canvas-fg/50">
            ☑ {doneCount}/{total} no total
          </p>
        )}
        <FlowChecklistGroups groups={task.checklists} onChange={(checklists) => onCommit({ checklists })} />

        <SectionHeader label="Observações" />
        <EntryListEditor placeholder="Nova observação…" items={task.notes} onChange={(notes) => onCommit({ notes })} />

        <SectionHeader label="Decisões" />
        <EntryListEditor placeholder="Nova decisão…" items={task.decisions} onChange={(decisions) => onCommit({ decisions })} />

        <SectionHeader label="Histórico" />
        <div className="space-y-1.5 text-xs text-canvas-fg/60">
          {[...task.logs].reverse().map((log) => (
            <div key={log.id} className="flex gap-2">
              <span className="shrink-0 text-canvas-fg/30">{formatLogTimestamp(log.created_at)}</span>
              <span>{log.message}</span>
            </div>
          ))}
          {task.logs.length === 0 && <p className="text-canvas-fg/30">Nenhum registro ainda.</p>}
        </div>

        {confirmingForce && (
          <div className="mt-4 border-2 border-accent-red bg-accent-red/10 p-3 text-center">
            <p className="text-sm font-semibold">
              Ainda existem {pending} {pending === 1 ? 'item pendente' : 'itens pendentes'}.
            </p>
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
