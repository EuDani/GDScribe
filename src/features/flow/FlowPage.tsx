import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { motion } from 'motion/react'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Select, TextInput, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SectorPicker, matchesSectorFilter } from '@/components/SectorPicker'
import type { FlowPriority, FlowTask, FlowTaskState, Project } from '@/lib/types'
import { FLOW_PRIORITIES } from '@/lib/types'
import { useProjectSectors } from '@/features/settings/useProjectSectors'
import { FlowColumn } from '@/features/flow/FlowColumn'
import { FlowFocusPanel } from '@/features/flow/FlowFocusPanel'
import { FlowTaskCardFace } from '@/features/flow/FlowTaskCard'
import { FlowTaskModal } from '@/features/flow/FlowTaskModal'
import { CancelTaskDialog } from '@/features/flow/CancelTaskDialog'
import { appendLogs, priorityMeta, STATE_LABELS, stopTimer, diffTaskEdit } from '@/features/flow/flowLogic'
import {
  useBulkUpdateFlowTasks,
  useCreateFlowTask,
  useDeleteFlowTask,
  useFlowTasks,
  useUpdateFlowTask,
} from '@/features/flow/useFlow'

function formatShortDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

export function FlowPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: tasks } = useFlowTasks(project.id)
  const { data: sectors } = useProjectSectors(project.id)
  const createTask = useCreateFlowTask(project.id)
  const updateTask = useUpdateFlowTask(project.id)
  const bulkUpdate = useBulkUpdateFlowTasks(project.id)
  const deleteTask = useDeleteFlowTask(project.id)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [activeTask, setActiveTask] = useState<FlowTask | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<Set<FlowPriority>>(new Set())
  const [sectorFilter, setSectorFilter] = useState<string[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPriority, setNewPriority] = useState<FlowPriority>('normal')

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [cancelingTaskId, setCancelingTaskId] = useState<string | null>(null)

  const editingTask = tasks?.find((t) => t.id === editingTaskId) ?? null
  const focusedTask = tasks?.find((t) => t.state === 'focus') ?? null
  const cancelingTask = tasks?.find((t) => t.id === cancelingTaskId) ?? null

  function matchesFilters(t: FlowTask) {
    return (priorityFilter.size === 0 || priorityFilter.has(t.priority)) && matchesSectorFilter(t.sectors, sectorFilter)
  }

  function bucket(state: FlowTaskState) {
    return (tasks ?? [])
      .filter((t) => t.state === state)
      .filter(matchesFilters)
      .sort((a, b) => a.queue_order - b.queue_order)
  }

  const backlog = bucket('backlog')
  const queue = bucket('queued')
  const paused = bucket('paused')
  const history = (tasks ?? [])
    .filter((t) => t.state === 'done' || t.state === 'cancelled')
    .filter(matchesFilters)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  function togglePriority(p: FlowPriority) {
    setPriorityFilter((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  function handleFocusTask(task: FlowTask) {
    if (task.state === 'focus') return
    const current = tasks?.find((t) => t.state === 'focus')
    const updates: (Partial<FlowTask> & { id: string })[] = []
    if (current && current.id !== task.id) {
      updates.push({
        id: current.id,
        state: 'paused',
        ...stopTimer(current),
        logs: appendLogs(current.logs, [`Pausada — foco trocado para "${task.title}"`]),
      })
    }
    updates.push({
      id: task.id,
      state: 'focus',
      active_since: new Date().toISOString(),
      logs: appendLogs(task.logs, [current ? `Foco retomado (troca com "${current.title}")` : 'Foco iniciado']),
    })
    bulkUpdate.mutate(updates)
  }

  function resumeTask(task: FlowTask) {
    const list = bucket('queued')
    bulkUpdate.mutate([
      { id: task.id, state: 'queued', queue_order: list.length, logs: appendLogs(task.logs, ['Retomada — voltou para a fila']) },
    ])
  }

  function pauseFocusTask() {
    if (!focusedTask) return
    bulkUpdate.mutate([
      { id: focusedTask.id, state: 'paused', ...stopTimer(focusedTask), logs: appendLogs(focusedTask.logs, ['Pausada manualmente']) },
    ])
  }

  function completeFocusTask(force: boolean) {
    if (!focusedTask) return
    const pending = focusedTask.checklist.filter((i) => !i.done).length
    const message = force && pending > 0 ? `Concluída com ${pending} item(ns) pendente(s) (forçada)` : 'Concluída'
    bulkUpdate.mutate([
      {
        id: focusedTask.id,
        state: 'done',
        completed_at: new Date().toISOString(),
        ...stopTimer(focusedTask),
        logs: appendLogs(focusedTask.logs, [message]),
      },
    ])
  }

  function toggleFocusChecklistItem(itemId: string) {
    if (!focusedTask) return
    const checklist = focusedTask.checklist.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i))
    const messages = diffTaskEdit(focusedTask, { checklist })
    updateTask.mutate({ id: focusedTask.id, checklist, logs: appendLogs(focusedTask.logs, messages) })
  }

  function addFocusNote(text: string) {
    if (!focusedTask) return
    const notes = [...focusedTask.notes, { id: crypto.randomUUID(), text, created_at: new Date().toISOString() }]
    updateTask.mutate({ id: focusedTask.id, notes, logs: appendLogs(focusedTask.logs, ['Observação adicionada']) })
  }

  function addFocusDecision(text: string) {
    if (!focusedTask) return
    const decisions = [...focusedTask.decisions, { id: crypto.randomUUID(), text, created_at: new Date().toISOString() }]
    updateTask.mutate({ id: focusedTask.id, decisions, logs: appendLogs(focusedTask.logs, ['Decisão registrada']) })
  }

  function openCancelDialog(taskId: string) {
    setEditingTaskId(null)
    setCancelingTaskId(taskId)
  }

  function handleConfirmCancel(reason: string) {
    if (!cancelingTask) {
      setCancelingTaskId(null)
      return
    }
    const message = reason ? `Cancelada: ${reason}` : 'Cancelada'
    bulkUpdate.mutate([
      {
        id: cancelingTask.id,
        state: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason || null,
        ...stopTimer(cancelingTask),
        logs: appendLogs(cancelingTask.logs, [message]),
      },
    ])
    setCancelingTaskId(null)
  }

  function handleDragStart(event: DragStartEvent) {
    const task = (tasks ?? []).find((t) => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over || !tasks) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task) return

    const overType = over.data.current?.type as 'column' | 'task' | 'focus-zone' | undefined

    if (overType === 'focus-zone') {
      handleFocusTask(task)
      return
    }

    let targetState: FlowTaskState
    if (overType === 'column') targetState = over.id as FlowTaskState
    else {
      const overTask = tasks.find((t) => t.id === over.id)
      targetState = overTask?.state ?? task.state
    }

    if (targetState === 'focus') {
      handleFocusTask(task)
      return
    }
    if (targetState !== 'backlog' && targetState !== 'queued' && targetState !== 'paused') return

    const wasFocus = task.state === 'focus'
    const sourceState = task.state
    const destList = bucket(targetState).filter((t) => t.id !== task.id)
    let insertIndex = destList.length
    if (overType === 'task') {
      const idx = destList.findIndex((t) => t.id === over.id)
      if (idx >= 0) insertIndex = idx
    }
    destList.splice(insertIndex, 0, task)

    const timerFields = wasFocus ? stopTimer(task) : {}
    const logMessages = sourceState !== targetState ? [`Movida para ${STATE_LABELS[targetState]}`] : []

    const updates: (Partial<FlowTask> & { id: string })[] = destList.map((t, i) => ({
      id: t.id,
      state: targetState,
      queue_order: i,
      ...(t.id === task.id ? { ...timerFields, logs: appendLogs(task.logs, logMessages) } : {}),
    }))

    if (sourceState !== targetState && sourceState !== 'focus') {
      const sourceList = bucket(sourceState).filter((t) => t.id !== task.id)
      updates.push(...sourceList.map((t, i) => ({ id: t.id, queue_order: i })))
    }

    bulkUpdate.mutate(updates)
  }

  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    createTask.mutate({ title: newTitle.trim(), description: newDescription.trim() || null, priority: newPriority })
    setNewTitle('')
    setNewDescription('')
    setNewPriority('normal')
    setCreateModalOpen(false)
  }

  function handleSaveEdit(fields: Partial<FlowTask>) {
    if (!editingTask) return
    const messages = diffTaskEdit(editingTask, fields)
    updateTask.mutate({ id: editingTask.id, ...fields, logs: appendLogs(editingTask.logs, messages) })
    setEditingTaskId(null)
  }

  const hasAnyTask = (tasks ?? []).length > 0

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-display text-2xl">Flow</h1>
          <p className="text-sm text-canvas-fg/50">O que estou fazendo? O que faço depois? Quando termino?</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setCreateModalOpen(true)}>
          Nova tarefa
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-label text-[10px] text-canvas-fg/40">Prioridade:</span>
          {FLOW_PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => togglePriority(p.value)}
              className={clsx(
                'text-label border-2 px-1.5 py-0.5 text-[10px]',
                priorityFilter.has(p.value) ? 'border-ink text-ink' : 'border-line/40 text-canvas-fg/50 hover:text-canvas-fg',
              )}
              style={priorityFilter.has(p.value) ? { backgroundColor: p.color } : undefined}
            >
              {p.dot} {p.label}
            </button>
          ))}
        </div>
        {(sectors ?? []).length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-label text-[10px] text-canvas-fg/40">Setor:</span>
            <SectorPicker value={sectorFilter} onChange={setSectorFilter} sectors={sectors ?? []} />
          </div>
        )}
        {(priorityFilter.size > 0 || sectorFilter.length > 0) && (
          <button
            type="button"
            onClick={() => {
              setPriorityFilter(new Set())
              setSectorFilter([])
            }}
            className="text-label text-[10px] text-canvas-fg/40 underline"
          >
            limpar
          </button>
        )}
      </div>

      {!hasAnyTask && (
        <EmptyState
          title="Nenhuma tarefa ainda"
          description="Cadastre tudo que precisa fazer — organize depois."
          action={
            <Button icon={<Plus size={16} />} onClick={() => setCreateModalOpen(true)}>
              Nova tarefa
            </Button>
          }
        />
      )}

      {hasAnyTask && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="mb-4">
            <FlowFocusPanel
              task={focusedTask}
              sectors={sectors ?? []}
              onToggleChecklistItem={toggleFocusChecklistItem}
              onAddNote={addFocusNote}
              onAddDecision={addFocusDecision}
              onPause={pauseFocusTask}
              onComplete={completeFocusTask}
              onCancel={() => focusedTask && openCancelDialog(focusedTask.id)}
              onEdit={() => focusedTask && setEditingTaskId(focusedTask.id)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <FlowColumn
              state="backlog"
              label="Backlog"
              tasks={backlog}
              sectors={sectors ?? []}
              onAddTask={() => setCreateModalOpen(true)}
              onTaskClick={(t) => setEditingTaskId(t.id)}
              onFocusTask={handleFocusTask}
            />
            <FlowColumn
              state="queued"
              label="Fila"
              tasks={queue}
              sectors={sectors ?? []}
              onTaskClick={(t) => setEditingTaskId(t.id)}
              onFocusTask={handleFocusTask}
            />
            <FlowColumn
              state="paused"
              label="Pausadas"
              tasks={paused}
              sectors={sectors ?? []}
              onTaskClick={(t) => setEditingTaskId(t.id)}
              onFocusTask={handleFocusTask}
              onResumeTask={resumeTask}
            />
          </div>

          <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
            {activeTask && (
              <motion.div
                initial={{ scale: 1, rotate: 0 }}
                animate={{ scale: 1.06, rotate: 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="w-72 overflow-hidden border-2 border-line bg-paper text-ink shadow-brutal-lg"
              >
                <FlowTaskCardFace task={activeTask} sectors={sectors ?? []} />
              </motion.div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {history.length > 0 && (
        <div className="mt-6 border-t-2 border-line pt-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="text-label flex items-center gap-1.5 text-xs text-canvas-fg/50 hover:text-canvas-fg"
          >
            {historyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Concluídas e canceladas ({history.length})
          </button>
          {historyOpen && (
            <div className="mt-3 space-y-1.5">
              {history.map((t) => {
                const priority = priorityMeta(t.priority)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEditingTaskId(t.id)}
                    className="flex w-full items-center justify-between gap-2 border-2 border-line/30 bg-surface px-3 py-2 text-left text-sm hover:border-line"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="h-2 w-2 shrink-0 border border-line" style={{ backgroundColor: priority.color }} />
                      <span className={clsx('truncate', t.state === 'cancelled' && 'text-canvas-fg/50 line-through')}>{t.title}</span>
                    </span>
                    <span className="text-label shrink-0 text-[10px] text-canvas-fg/40">
                      {STATE_LABELS[t.state]} · {formatShortDate((t.state === 'done' ? t.completed_at : t.cancelled_at)?.slice(0, 10) ?? t.updated_at.slice(0, 10))}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Nova tarefa" isDirty={Boolean(newTitle.trim() || newDescription.trim())}>
        <form onSubmit={handleCreateTask}>
          <Field label="Título">
            <TextInput required autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </Field>
          <Field label="Descrição" hint="Opcional">
            <Textarea rows={3} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
          </Field>
          <Field label="Prioridade">
            <Select value={newPriority} onChange={(e) => setNewPriority(e.target.value as FlowPriority)}>
              {FLOW_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.dot} {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Adicionar ao backlog</Button>
          </div>
        </form>
      </Modal>

      <FlowTaskModal
        open={Boolean(editingTask)}
        task={editingTask}
        sectors={sectors ?? []}
        onClose={() => setEditingTaskId(null)}
        onSave={handleSaveEdit}
        onDelete={() => editingTask && setPendingDelete(editingTask.id)}
        onCancelTask={() => editingTask && openCancelDialog(editingTask.id)}
      />

      <CancelTaskDialog open={Boolean(cancelingTask)} onClose={() => setCancelingTaskId(null)} onConfirm={handleConfirmCancel} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteTask.mutate(pendingDelete)
          setEditingTaskId(null)
        }}
        title="Excluir tarefa"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  )
}
