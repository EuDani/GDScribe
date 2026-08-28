import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { clsx } from 'clsx'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Select, TextInput, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { PHASES, type GddModule, type Phase, type Project } from '@/lib/types'
import {
  useCreateModule,
  useDeleteModule,
  useGddModules,
  useUpdateModule,
} from '@/features/gdd/useGddModules'

const PHASE_LABEL: Record<Phase, string> = Object.fromEntries(
  PHASES.map((p) => [p.value, p.label]),
) as Record<Phase, string>

export function GddPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: modules, isLoading } = useGddModules(project.id)
  const createModule = useCreateModule(project.id)
  const updateModule = useUpdateModule(project.id)
  const deleteModule = useDeleteModule(project.id)

  const [phaseFilter, setPhaseFilter] = useState<Phase>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [draft, setDraft] = useState('')
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPhase, setNewPhase] = useState<Phase>('all')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const filtered = useMemo(
    () => (modules ?? []).filter((m) => phaseFilter === 'all' || m.phase === phaseFilter),
    [modules, phaseFilter],
  )

  const selected = modules?.find((m) => m.id === selectedId) ?? filtered[0] ?? null

  useEffect(() => {
    setDraft(selected?.content ?? '')
  }, [selected?.id, selected?.content])

  const isDirty = selected ? draft !== (selected.content ?? '') : false

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const created = await createModule.mutateAsync({ title: newTitle.trim(), phase: newPhase })
    setSelectedId(created.id)
    setNewTitle('')
    setNewPhase('all')
    setCreating(false)
  }

  return (
    <div className="flex h-full min-h-[70vh] flex-col">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl">Documento de Design</h1>
        <Button size="sm" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
          Novo módulo
        </Button>
      </div>

      <Tabs items={PHASES} value={phaseFilter} onChange={setPhaseFilter} />

      {isLoading && <p className="text-label mt-6 text-sm text-paper/50">Carregando…</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Nenhum módulo nessa fase"
            description="Crie um módulo customizado ou troque o filtro de fase."
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
                  onClick={() => {
                    setSelectedId(m.id)
                    setView('edit')
                  }}
                  className={clsx(
                    'w-full cursor-pointer border-2 px-3 py-2.5 text-left transition-colors',
                    selected?.id === m.id
                      ? 'border-ink bg-accent-yellow text-ink shadow-brutal-sm'
                      : 'border-ink/40 bg-ink-soft text-paper/80 hover:border-ink',
                  )}
                >
                  <div className="text-sm font-semibold">{m.title}</div>
                  <div className="text-label mt-0.5 text-[10px] opacity-60">
                    {PHASE_LABEL[m.phase]}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="min-w-0 border-2 border-ink bg-ink-soft shadow-brutal">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink p-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <TextInput
                    value={selected.title}
                    onChange={(e) =>
                      updateModule.mutate({ id: selected.id, title: e.target.value })
                    }
                    className="max-w-xs"
                  />
                  <Select
                    value={selected.phase}
                    onChange={(e) =>
                      updateModule.mutate({ id: selected.id, phase: e.target.value as Phase })
                    }
                    className="max-w-[160px]"
                  >
                    {PHASES.filter((p) => p.value !== 'all' || true).map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                  {selected.is_custom && <Badge accent="purple">Custom</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  {selected.is_custom && (
                    <button
                      type="button"
                      onClick={() => setPendingDelete(selected.id)}
                      aria-label="Excluir módulo"
                      className="cursor-pointer border-2 border-ink p-1.5 text-paper/60 hover:bg-accent-red hover:text-paper"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 px-4 pt-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setView('edit')}
                    className={clsx(
                      'text-label border-2 border-ink px-2.5 py-1 text-[11px]',
                      view === 'edit' ? 'bg-accent-yellow text-ink' : 'text-paper/60',
                    )}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('preview')}
                    className={clsx(
                      'text-label border-2 border-ink px-2.5 py-1 text-[11px]',
                      view === 'preview' ? 'bg-accent-yellow text-ink' : 'text-paper/60',
                    )}
                  >
                    Preview
                  </button>
                </div>
                <Button
                  size="sm"
                  disabled={!isDirty || updateModule.isPending}
                  onClick={() => updateModule.mutate({ id: selected.id, content: draft })}
                >
                  {updateModule.isPending ? 'Salvando…' : isDirty ? 'Salvar' : 'Salvo'}
                </Button>
              </div>

              <div className="p-4">
                {view === 'edit' ? (
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={18}
                    className="font-mono text-xs"
                    placeholder="Escreva em Markdown…"
                  />
                ) : (
                  <div className="prose prose-invert max-w-none text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {draft || '*Nada escrito ainda.*'}
                    </ReactMarkdown>
                  </div>
                )}
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
