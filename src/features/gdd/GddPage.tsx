import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Select, TextInput } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { StatusSelect } from '@/components/StatusSelect'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { PHASES, type ExtraField, type GddModule, type Phase, type Project } from '@/lib/types'
import {
  useCreateModule,
  useDeleteModule,
  useGddModules,
  useUpdateModule,
} from '@/features/gdd/useGddModules'
import { ExtraFieldsEditor } from '@/features/gdd/ExtraFieldsEditor'

const PHASE_LABEL: Record<Phase, string> = Object.fromEntries(
  PHASES.map((p) => [p.value, p.label]),
) as Record<Phase, string>

function sameExtraFields(a: ExtraField[], b: ExtraField[]) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function GddPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: modules, isLoading } = useGddModules(project.id)
  const createModule = useCreateModule(project.id)
  const updateModule = useUpdateModule(project.id)
  const deleteModule = useDeleteModule(project.id)

  const [phaseFilter, setPhaseFilter] = useState<Phase>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [draftExtraFields, setDraftExtraFields] = useState<ExtraField[]>([])
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPhase, setNewPhase] = useState<Phase>('all')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const filtered = useMemo(
    () =>
      (modules ?? []).filter((m) => {
        const matchesPhase = phaseFilter === 'all' || m.phase === phaseFilter
        const matchesSearch = m.title.toLowerCase().includes(search.trim().toLowerCase())
        return matchesPhase && matchesSearch
      }),
    [modules, phaseFilter, search],
  )

  const selected = modules?.find((m) => m.id === selectedId) ?? filtered[0] ?? null

  useEffect(() => {
    setDraft(selected?.content ?? '')
    setDraftExtraFields(selected?.extra_fields ?? [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  const isDirty = selected
    ? draft !== (selected.content ?? '') || !sameExtraFields(draftExtraFields, selected.extra_fields ?? [])
    : false

  function persist(moduleId: string, content: string, extraFields: ExtraField[]) {
    updateModule.mutate({ id: moduleId, content, extra_fields: extraFields })
  }

  function flush() {
    if (selected && isDirty) persist(selected.id, draft, draftExtraFields)
  }

  function selectModule(id: string) {
    flush()
    setSelectedId(id)
  }

  // autosave enquanto digita, sem precisar trocar de módulo
  useEffect(() => {
    if (!selected || !isDirty) return
    const t = setTimeout(() => persist(selected.id, draft, draftExtraFields), 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, draftExtraFields])

  // garante que a última edição não se perca ao sair da página
  const flushRef = useRef(flush)
  flushRef.current = flush
  useEffect(() => () => flushRef.current(), [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const created = await createModule.mutateAsync({ title: newTitle.trim(), phase: newPhase })
    selectModule(created.id)
    setNewTitle('')
    setNewPhase('all')
    setCreating(false)
  }

  return (
    <div className="flex h-full min-h-[70vh] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl">Documento de Design</h1>
        <Button size="sm" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
          Novo módulo
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2 border-2 border-line bg-paper px-3 py-2 text-ink">
        <Search size={15} className="shrink-0 text-ink/50" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar módulos…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
        />
      </div>

      <Tabs items={PHASES} value={phaseFilter} onChange={setPhaseFilter} />

      {isLoading && <p className="text-label mt-6 text-sm text-canvas-fg/50">Carregando…</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Nenhum módulo encontrado"
            description="Ajuste a busca, troque o filtro de fase ou crie um módulo customizado."
          />
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="mt-6 grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
          <ul className="space-y-1.5">
            {filtered.map((m: GddModule) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => selectModule(m.id)}
                  className={clsx(
                    'w-full cursor-pointer border-2 px-3 py-2.5 text-left transition-colors',
                    selected?.id === m.id
                      ? 'border-line bg-accent-yellow text-ink shadow-brutal-sm'
                      : 'border-line/40 bg-surface text-canvas-fg/80 hover:border-line',
                  )}
                >
                  <div className="text-sm font-semibold">{m.title}</div>
                  <div className="text-label mt-0.5 flex items-center gap-1.5 text-[10px] opacity-60">
                    {PHASE_LABEL[m.phase]}
                    {m.status && <span>· {m.status}</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="min-w-0 border-2 border-line bg-surface shadow-brutal">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line p-4">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <TextInput
                    value={selected.title}
                    onChange={(e) => updateModule.mutate({ id: selected.id, title: e.target.value })}
                    className="max-w-xs"
                  />
                  <Select
                    value={selected.phase}
                    onChange={(e) => updateModule.mutate({ id: selected.id, phase: e.target.value as Phase })}
                    className="max-w-[150px]"
                  >
                    {PHASES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                  <StatusSelect
                    projectId={project.id}
                    value={selected.status}
                    onChange={(status) => updateModule.mutate({ id: selected.id, status })}
                    className="max-w-[150px]"
                  />
                  {selected.is_custom && <Badge accent="purple">Custom</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-label text-[10px] text-canvas-fg/40">
                    {updateModule.isPending ? 'Salvando…' : isDirty ? 'Alterações pendentes' : 'Salvo automaticamente'}
                  </span>
                  {selected.is_custom && (
                    <button
                      type="button"
                      onClick={() => setPendingDelete(selected.id)}
                      aria-label="Excluir módulo"
                      className="cursor-pointer border-2 border-line p-1.5 text-canvas-fg/60 hover:bg-accent-red hover:text-canvas-fg"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4">
                <MarkdownEditor projectId={project.id} value={draft} onChange={setDraft} rows={16} />

                <div className="mt-5 border-t-2 border-line/30 pt-4">
                  <h3 className="text-label mb-3 text-xs text-canvas-fg/60">Campos extras</h3>
                  <ExtraFieldsEditor fields={draftExtraFields} onChange={setDraftExtraFields} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Novo módulo">
        <form onSubmit={handleCreate}>
          <Field label="Título">
            <TextInput
              required
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Sistema de Progressão"
            />
          </Field>
          <Field label="Fase">
            <Select value={newPhase} onChange={(e) => setNewPhase(e.target.value as Phase)}>
              {PHASES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createModule.isPending}>
              Criar módulo
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteModule.mutate(pendingDelete)
          setSelectedId(null)
        }}
        title="Excluir módulo"
        description="O conteúdo desse módulo será apagado permanentemente."
        confirmLabel="Excluir"
      />
    </div>
  )
}
