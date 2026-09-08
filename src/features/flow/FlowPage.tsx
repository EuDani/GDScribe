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
import { Archive, Plus } from 'lucide-react'
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
import { FlowOverviewModal } from '@/features/flow/FlowOverviewModal'
import { CancelTaskDialog } from '@/features/flow/CancelTaskDialog'
import { appendLogs, nextVersionLabel, STATE_LABELS, stopTimer, diffTaskEdit } from '@/features/flow/flowLogic'
import {
  useBulkUpdateFlowTasks,
  useCreateFlowTask,
  useDeleteFlowTask,
  useFlowTasks,
  useUpdateFlowTask,
} from '@/features/flow/useFlow'

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
  const [overviewOpen, setOverviewOpen] = useState(false)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPriority, setNewPriority] = useState<FlowPriority>('normal')

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [cancelingTaskId, setCancelingTaskId] = useState<string | null>(null)
  const [confirmingBumpVersion, setConfirmingBumpVersion] = useState(false)
  const [focusExpanded, setFocusExpanded] = useState(false)

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

  const queue = bucket('queued')
  const overviewTasks = (tasks ?? []).filter((t) => t.state !== 'focus')

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
    setOverviewOpen(false)
  }

  function sendToQueue(task: FlowTask) {
    const list = bucket('queued')
    const message = task.state === 'paused' ? 'Retomada — voltou para a fila' : 'Movida para a fila'
    bulkUpdate.mutate([{ id: task.id, state: 'queued', queue_order: list.length, logs: appendLogs(task.logs, [message]) }])
  }

  function pauseFocusTask() {
    if (!focusedTask) return
    bulkUpdate.mutate([
      { id: focusedTask.id, state: 'paused', ...stopTimer(focusedTask), logs: appendLogs(focusedTask.logs, ['Pausada manualmente']) },
    ])
  }

  function completeFocusTask(force: boolean) {
    if (!focusedTask) return
    const pending = focusedTask.checklists.flatMap((g) => g.items).filter((i) => !i.done).length
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

  function commitFocusEdit(fields: Partial<FlowTask>) {
    if (!focusedTask) return
    const messages = diffTaskEdit(focusedTask, fields)
    updateTask.mutate({ id: focusedTask.id, ...fields, logs: appendLogs(focusedTask.logs, messages) })
  }

  function handleBumpVersion() {
    if (!focusedTask) return
    const oldVersion = focusedTask.version_label
    const newVersion = nextVersionLabel(oldVersion)
    createTask.mutate({
      title: focusedTask.title,
      description: focusedTask.description,
      priority: focusedTask.priority,
      sectors: focusedTask.sectors,
      checklists: focusedTask.checklists,
      version_label: oldVersion,
      start_date: focusedTask.start_date,
      state: 'backlog',
      logs: [
        {
          id: crypto.randomUUID(),
          message: `Arquivada no backlog como versão anterior (${oldVersion}) de "${focusedTask.title}"`,
          created_at: new Date().toISOString(),
        },
      ],
    })
    updateTask.mutate({
      id: focusedTask.id,
      version_label: newVersion,
      logs: appendLogs(focusedTask.logs, [`Nova versão: ${newVersion} — ${oldVersion} arquivada no backlog`]),
    })
    setConfirmingBumpVersion(false)
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
    if (targetState !== 'queued') return

    const sourceState = task.state
    const destList = bucket(targetState).filter((t) => t.id !== task.id)
    let insertIndex = destList.length
    if (overType === 'task') {
      const idx = destList.findIndex((t) => t.id === over.id)
      if (idx >= 0) insertIndex = idx
    }
    destList.splice(insertIndex, 0, task)

    const logMessages = sourceState !== targetState ? [`Movida para ${STATE_LABELS[targetState]}`] : []

    const updates: (Partial<FlowTask> & { id: string })[] = destList.map((t, i) => ({
      id: t.id,
      state: targetState,
      queue_order: i,
      ...(t.id === task.id ? { logs: appendLogs(task.logs, logMessages) } : {}),
    }))

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
        <div className="flex gap-2">
          <Button variant="ghost" icon={<Archive size={16} />} onClick={() => setOverviewOpen(true)}>
            Backlog
          </Button>
          <Button icon={<Plus size={16} />} onClick={() => setCreateModalOpen(true)}>
            Nova tarefa
          </Button>
        </div>
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            {!focusExpanded && (
              <div className="lg:w-2/5">
                <FlowColumn
                  state="queued"
                  label="Fila"
                  tasks={queue}
                  sectors={sectors ?? []}
                  onAddTask={() => setCreateModalOpen(true)}
                  onTaskClick={(t) => setEditingTaskId(t.id)}
                  onFocusTask={handleFocusTask}
                  className="h-[720px]"
                />
              </div>
            )}

            <div className={clsx(focusExpanded ? 'w-full h-[80vh]' : 'lg:w-3/5')}>
              <FlowFocusPanel
                task={focusedTask}
                sectors={sectors ?? []}
                projectId={project.id}
                expanded={focusExpanded}
                onToggleExpand={() => setFocusExpanded((v) => !v)}
                onCommit={commitFocusEdit}
                onBumpVersion={() => setConfirmingBumpVersion(true)}
                onPause={pauseFocusTask}
                onComplete={completeFocusTask}
                onCancel={() => focusedTask && openCancelDialog(focusedTask.id)}
                onDelete={() => focusedTask && setPendingDelete(focusedTask.id)}
              />
            </div>
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
            <Button type="submit">Adicionar à fila</Button>
          </div>
        </form>
      </Modal>

      <FlowTaskModal
        open={Boolean(editingTask)}
        task={editingTask}
        sectors={sectors ?? []}
        projectId={project.id}
        onClose={() => setEditingTaskId(null)}
        onSave={handleSaveEdit}
        onDelete={() => editingTask && setPendingDelete(editingTask.id)}
        onCancelTask={() => editingTask && openCancelDialog(editingTask.id)}
      />

      <FlowOverviewModal
        open={overviewOpen}
        onClose={() => setOverviewOpen(false)}
        tasks={overviewTasks}
        onTaskClick={(t) => {
          setOverviewOpen(false)
          setEditingTaskId(t.id)
        }}
        onFocusTask={handleFocusTask}
        onSendToQueue={sendToQueue}
      />

      <CancelTaskDialog open={Boolean(cancelingTask)} onClose={() => setCancelingTaskId(null)} onConfirm={handleConfirmCancel} />

      <ConfirmDialog
        open={confirmingBumpVersion}
        onClose={() => setConfirmingBumpVersion(false)}
        onConfirm={handleBumpVersion}
        title="Nova versão"
        description={
          focusedTask
            ? `A versão atual (${focusedTask.version_label}) será arquivada no backlog, e essa tarefa continua como ${nextVersionLabel(focusedTask.version_label)}.`
            : ''
        }
        confirmLabel="Criar nova versão"
      />

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
