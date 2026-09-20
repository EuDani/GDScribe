import type { FlowChecklistGroup, FlowLogEntry, FlowPriority, FlowTask, FlowTaskState } from '@/lib/types'
import { FLOW_PRIORITIES } from '@/lib/types'

export const STATE_LABELS: Record<FlowTaskState, string> = {
  backlog: 'Backlog',
  queued: 'Fila',
  focus: 'Foco',
  paused: 'Pausada',
  done: 'Concluída',
  cancelled: 'Cancelada',
}

export function priorityMeta(priority: FlowPriority) {
  return FLOW_PRIORITIES.find((p) => p.value === priority) ?? FLOW_PRIORITIES[2]
}

export function makeLog(message: string): FlowLogEntry {
  return { id: crypto.randomUUID(), message, created_at: new Date().toISOString() }
}

export function appendLogs(logs: FlowLogEntry[], messages: string[]): FlowLogEntry[] {
  if (messages.length === 0) return logs
  return [...logs, ...messages.map(makeLog)]
}

/** Segundos acumulados de uma tarefa, somando a sessão de foco em andamento (se houver). */
export function liveTimeSpent(task: Pick<FlowTask, 'time_spent_seconds' | 'active_since' | 'state'>): number {
  if (task.state !== 'focus' || !task.active_since) return task.time_spent_seconds
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(task.active_since).getTime()) / 1000))
  return task.time_spent_seconds + elapsed
}

/** Ao sair do foco: soma o tempo da sessão corrente ao total e para o cronômetro. */
export function stopTimer(task: Pick<FlowTask, 'time_spent_seconds' | 'active_since'>): {
  time_spent_seconds: number
  active_since: null
} {
  if (!task.active_since) return { time_spent_seconds: task.time_spent_seconds, active_since: null }
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(task.active_since).getTime()) / 1000))
  return { time_spent_seconds: task.time_spent_seconds + elapsed, active_since: null }
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h === 0 && m === 0) return '<1min'
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

export function formatLogTimestamp(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

/** Soma os itens de todos os checklists nomeados de uma tarefa num único total. */
export function aggregateChecklistProgress(checklists: FlowChecklistGroup[]): { done: number; total: number } {
  const items = checklists.flatMap((g) => g.items)
  return { done: items.filter((i) => i.done).length, total: items.length }
}

/**
 * Previsão de conclusão: extrapola linearmente o ritmo de checklist concluída
 * (somando todos os checklists nomeados) desde a criação da tarefa (dias
 * corridos / % concluído) — mesma lógica de tendência usada no roadmap do
 * projeto, só que por tarefa.
 */
export function computeForecastDate(task: Pick<FlowTask, 'checklists' | 'created_at'>): string | null {
  const { done, total } = aggregateChecklistProgress(task.checklists)
  if (total === 0 || done === 0 || done >= total) return null
  const percent = done / total
  const elapsedMs = Date.now() - new Date(task.created_at).getTime()
  if (elapsedMs <= 0) return null
  const totalMs = elapsedMs / percent
  const remainingMs = totalMs - elapsedMs
  return new Date(Date.now() + remainingMs).toISOString().slice(0, 10)
}

/** Gera o próximo rótulo de versão — "v1" -> "v2", "Versão 3" -> "Versão 4", senão anexa " 2". */
export function nextVersionLabel(current: string): string {
  const match = current.trim().match(/^(.*?)(\d+)(\D*)$/)
  if (match) {
    const [, prefix, num, suffix] = match
    return `${prefix}${Number(num) + 1}${suffix}`
  }
  return `${current.trim()} 2`.trim()
}

/** Compara a diferença entre dois conjuntos de checklists nomeados e devolve mensagens de log legíveis. */
function diffChecklistGroups(before: FlowChecklistGroup[], after: FlowChecklistGroup[]): string[] {
  const messages: string[] = []
  const beforeGroups = new Map(before.map((g) => [g.id, g]))
  const afterGroups = new Map(after.map((g) => [g.id, g]))

  for (const g of after) {
    if (!beforeGroups.has(g.id)) messages.push(`Checklist "${g.name}" criado`)
  }
  for (const g of before) {
    if (!afterGroups.has(g.id)) messages.push(`Checklist "${g.name}" removido`)
  }

  for (const g of after) {
    const prevGroup = beforeGroups.get(g.id)
    if (!prevGroup) continue
    const beforeIds = new Set(prevGroup.items.map((i) => i.id))
    const afterIds = new Set(g.items.map((i) => i.id))
    const added = g.items.filter((i) => !beforeIds.has(i.id))
    const removed = prevGroup.items.filter((i) => !afterIds.has(i.id))
    if (added.length === 1) messages.push(`Item adicionado em "${g.name}": "${added[0].text}"`)
    else if (added.length > 1) messages.push(`${added.length} itens adicionados em "${g.name}"`)
    if (removed.length === 1) messages.push(`Item removido de "${g.name}": "${removed[0].text}"`)
    else if (removed.length > 1) messages.push(`${removed.length} itens removidos de "${g.name}"`)
    for (const item of g.items) {
      const prevItem = prevGroup.items.find((i) => i.id === item.id)
      if (prevItem && prevItem.done !== item.done) {
        messages.push(`"${item.text}" ${item.done ? 'concluído' : 'reaberto'} (${g.name})`)
      }
    }
  }
  return messages
}

/** Compara os campos editáveis de uma tarefa e gera as mensagens de log da edição. */
export function diffTaskEdit(before: FlowTask, after: Partial<FlowTask>): string[] {
  const messages: string[] = []
  if (after.title !== undefined && after.title !== before.title) {
    messages.push(`Título alterado para "${after.title}"`)
  }
  if (after.priority !== undefined && after.priority !== before.priority) {
    messages.push(`Prioridade alterada para ${priorityMeta(after.priority).label}`)
  }
  if (after.description !== undefined && after.description !== before.description) {
    messages.push('Descrição atualizada')
  }
  if (after.start_date !== undefined && after.start_date !== before.start_date) {
    messages.push(after.start_date ? `Início definido para ${after.start_date}` : 'Início removido')
  }
  if (after.desired_date !== undefined && after.desired_date !== before.desired_date) {
    messages.push(after.desired_date ? `Data desejada definida para ${after.desired_date}` : 'Data desejada removida')
  }
  if (after.version_label !== undefined && after.version_label !== before.version_label) {
    messages.push(`Nova versão: ${after.version_label}`)
  }
  if (after.sectors !== undefined && JSON.stringify(after.sectors) !== JSON.stringify(before.sectors)) {
    messages.push('Setores alterados')
  }
  if (after.checklists !== undefined) {
    messages.push(...diffChecklistGroups(before.checklists, after.checklists))
  }
  if (after.notes !== undefined && after.notes.length !== before.notes.length) {
    messages.push(after.notes.length > before.notes.length ? 'Observação adicionada' : 'Observação removida')
  }
  if (after.decisions !== undefined && after.decisions.length !== before.decisions.length) {
    messages.push(after.decisions.length > before.decisions.length ? 'Decisão registrada' : 'Decisão removida')
  }
  return messages
}
