import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import type { ChecklistItem, FlowNoteEntry, FlowPriority, FlowTask, ProjectSector } from '@/lib/types'
import { FLOW_PRIORITIES } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Field, Select, TextInput, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ChecklistEditor } from '@/components/ChecklistEditor'
import { SectorPicker } from '@/components/SectorPicker'
import { formatLogTimestamp, STATE_LABELS } from '@/features/flow/flowLogic'

function EntryListEditor({
  label,
  placeholder,
  items,
  onChange,
}: {
  label: string
  placeholder: string
  items: FlowNoteEntry[]
  onChange: (items: FlowNoteEntry[]) => void
}) {
  const [text, setText] = useState('')

  function add() {
    if (!text.trim()) return
    onChange([...items, { id: crypto.randomUUID(), text: text.trim(), created_at: new Date().toISOString() }])
    setText('')
  }

  return (
    <Field label={label}>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2 border-2 border-line/30 bg-canvas px-2 py-1.5 text-xs">
            <span className="flex-1">{item.text}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((i) => i.id !== item.id))}
              aria-label="Remover"
              className="shrink-0 cursor-pointer text-canvas-fg/40 hover:text-accent-red"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <TextInput
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="flex-1"
        />
        <button
          type="button"
          onClick={add}
          aria-label="Adicionar"
          className="cursor-pointer border-2 border-line p-1.5 text-canvas-fg/60 hover:bg-accent-yellow hover:text-ink"
        >
          <Plus size={14} />
        </button>
      </div>
    </Field>
  )
}

export function FlowTaskModal({
  open,
  task,
  sectors,
  onClose,
  onSave,
  onDelete,
  onCancelTask,
}: {
  open: boolean
  task: FlowTask | null
  sectors: ProjectSector[]
  onClose: () => void
  onSave: (fields: Partial<FlowTask>) => void
  onDelete: () => void
  onCancelTask: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<FlowPriority>('normal')
  const [desiredDate, setDesiredDate] = useState('')
  const [versionLabel, setVersionLabel] = useState('v1')
  const [taskSectors, setTaskSectors] = useState<string[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [notes, setNotes] = useState<FlowNoteEntry[]>([])
  const [decisions, setDecisions] = useState<FlowNoteEntry[]>([])
  const [logsOpen, setLogsOpen] = useState(false)

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description ?? '')
    setPriority(task.priority)
    setDesiredDate(task.desired_date ?? '')
    setVersionLabel(task.version_label)
    setTaskSectors(task.sectors)
    setChecklist(task.checklist)
    setNotes(task.notes)
    setDecisions(task.decisions)
    setLogsOpen(false)
  }, [task])

  if (!task) return null

  const isDirty =
    title !== task.title ||
    description !== (task.description ?? '') ||
    priority !== task.priority ||
    desiredDate !== (task.desired_date ?? '') ||
    versionLabel !== task.version_label ||
    JSON.stringify(taskSectors) !== JSON.stringify(task.sectors) ||
    JSON.stringify(checklist) !== JSON.stringify(task.checklist) ||
    JSON.stringify(notes) !== JSON.stringify(task.notes) ||
    JSON.stringify(decisions) !== JSON.stringify(task.decisions)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      desired_date: desiredDate || null,
      version_label: versionLabel.trim() || 'v1',
      sectors: taskSectors,
      checklist,
      notes,
      decisions,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar tarefa" wide isDirty={isDirty}>
      <form onSubmit={handleSave}>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-label border-2 border-line bg-accent-yellow px-2 py-0.5 text-[10px] font-semibold text-ink">
            {STATE_LABELS[task.state]}
          </span>
          {task.cancel_reason && <span className="text-xs text-canvas-fg/50">Motivo: {task.cancel_reason}</span>}
        </div>

        <Field label="Título">
          <TextInput required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Descrição" hint="Opcional">
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Prioridade">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as FlowPriority)}>
              {FLOW_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.dot} {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data desejada de conclusão">
            <TextInput type="date" value={desiredDate} onChange={(e) => setDesiredDate(e.target.value)} />
          </Field>
          <Field label="Versão">
            <TextInput value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder="v1" />
          </Field>
        </div>

        <Field label="Setores">
          <SectorPicker value={taskSectors} onChange={setTaskSectors} sectors={sectors} />
        </Field>

        <Field label="Checklist">
          <ChecklistEditor items={checklist} onChange={setChecklist} />
        </Field>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EntryListEditor label="Observações" placeholder="Nova observação…" items={notes} onChange={setNotes} />
          <EntryListEditor label="Decisões" placeholder="Nova decisão…" items={decisions} onChange={setDecisions} />
        </div>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => setLogsOpen((v) => !v)}
            className="text-label flex items-center gap-1 text-[11px] text-canvas-fg/40 hover:text-canvas-fg"
          >
            {logsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Histórico de alterações ({task.logs.length})
          </button>
          {logsOpen && (
            <div className={clsx('mt-2 max-h-40 space-y-1.5 overflow-y-auto border-2 border-line/30 bg-canvas p-2.5 text-xs text-canvas-fg/60')}>
              {[...task.logs].reverse().map((log) => (
                <div key={log.id} className="flex gap-2">
                  <span className="shrink-0 text-canvas-fg/30">{formatLogTimestamp(log.created_at)}</span>
                  <span>{log.message}</span>
                </div>
              ))}
              {task.logs.length === 0 && <p className="text-canvas-fg/30">Nenhum registro ainda.</p>}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-between gap-2">
          <div className="flex gap-2">
            <Button type="button" variant="danger" onClick={onDelete}>
              Excluir
            </Button>
            {task.state !== 'done' && task.state !== 'cancelled' && (
              <Button type="button" variant="ghost" onClick={onCancelTask}>
                Cancelar tarefa
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Fechar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
