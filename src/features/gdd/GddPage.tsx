import { useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, type DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CornerDownRight, Plus, Search, Trash2 } from 'lucide-react'
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
import { RichTextEditor } from '@/components/RichTextEditor'
import { SectorPicker, matchesSectorFilter } from '@/components/SectorPicker'
import { ALL_PHASES, type ExtraField, type GddModule, type Phase, type Project } from '@/lib/types'
import {
  useCreateModule,
  useDeleteModule,
  useGddModules,
  useReorderModules,
  useUpdateModule,
} from '@/features/gdd/useGddModules'
import { GddModuleRow } from '@/features/gdd/GddModuleRow'
import { useProjectPhases } from '@/features/settings/useProjectPhases'
import { useProjectSectors } from '@/features/settings/useProjectSectors'
import { ExtraFieldsEditor } from '@/features/gdd/ExtraFieldsEditor'

function sameExtraFields(a: ExtraField[], b: ExtraField[]) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function GddPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: modules, isLoading } = useGddModules(project.id)
  const { data: phases } = useProjectPhases(project.id)
  const { data: sectors } = useProjectSectors(project.id)
  const createModule = useCreateModule(project.id)
  const updateModule = useUpdateModule(project.id)
  const deleteModule = useDeleteModule(project.id)
  const reorderModules = useReorderModules(project.id)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const phaseItems = useMemo(
    () => [{ value: ALL_PHASES, label: 'Todas as fases' }, ...(phases ?? []).map((p) => ({ value: p.key, label: p.label }))],
    [phases],
  )
  const phaseLabel = useMemo(() => {
    const map: Record<string, string> = { [ALL_PHASES]: 'Todas as fases' }
    for (const p of phases ?? []) map[p.key] = p.label
    return map
  }, [phases])

  const [phaseFilter, setPhaseFilter] = useState<Phase>(ALL_PHASES)
  const [sectorFilter, setSectorFilter] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [draftExtraFields, setDraftExtraFields] = useState<ExtraField[]>([])
  const [creating, setCreating] = useState(false)
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newPhase, setNewPhase] = useState<Phase>(ALL_PHASES)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const topLevelFiltered = useMemo(
    () =>
      (modules ?? [])
        .filter((m) => !m.parent_id)
        .filter((m) => {
          const matchesPhase = phaseFilter === ALL_PHASES || m.phase === phaseFilter
          const matchesSearch = m.title.toLowerCase().includes(search.trim().toLowerCase())
          const matchesSector = matchesSectorFilter(m.sectors, sectorFilter)
          return matchesPhase && matchesSearch && matchesSector
        }),
    [modules, phaseFilter, search, sectorFilter],
  )

  const childrenByParent = useMemo(() => {
    const map = new Map<string, GddModule[]>()
    for (const m of modules ?? []) {
      if (!m.parent_id) continue
      const list = map.get(m.parent_id) ?? []
      list.push(m)
      map.set(m.parent_id, list)
    }
    return map
  }, [modules])

  const selected = modules?.find((m) => m.id === selectedId) ?? topLevelFiltered[0] ?? null

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

  function openCreate(parentId: string | null) {
    setCreatingParentId(parentId)
    setNewTitle('')
    setNewPhase(ALL_PHASES)
    setCreating(true)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = topLevelFiltered.findIndex((m) => m.id === active.id)
    const newIndex = topLevelFiltered.findIndex((m) => m.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = [...topLevelFiltered]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    reorderModules.mutate(reordered.map((m, i) => ({ id: m.id, sort_order: i })))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const created = await createModule.mutateAsync({
      title: newTitle.trim(),
      phase: newPhase,
      parentId: creatingParentId,
    })
    selectModule(created.id)
    setNewTitle('')
    setCreating(false)
  }

  return (
    <div className="flex h-full min-h-[70vh] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl">Documento de Design</h1>
        <Button size="sm" icon={<Plus size={16} />} onClick={() => openCreate(null)}>
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

      <Tabs items={phaseItems} value={phaseFilter} onChange={setPhaseFilter} />

      {(sectors ?? []).length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-label text-[10px] text-canvas-fg/40">Setor:</span>
          <SectorPicker value={sectorFilter} onChange={setSectorFilter} sectors={sectors ?? []} />
        </div>
      )}

      {isLoading && <p className="text-label mt-6 text-sm text-canvas-fg/50">Carregando…</p>}

      {!isLoading && topLevelFiltered.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Nenhum módulo encontrado"
            description="Ajuste a busca, troque o filtro de fase ou crie um módulo customizado."
          />
        </div>
      )}

      {!isLoading && topLevelFiltered.length > 0 && (
        <div className="mt-6 grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={topLevelFiltered.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1.5">
                {topLevelFiltered.map((m: GddModule) => (
                  <li key={m.id}>
                    <div className="flex items-center gap-1">
                      <GddModuleRow
                        module={m}
                        active={selected?.id === m.id}
                        phaseLabel={phaseLabel[m.phase] ?? m.phase}
                        onClick={() => selectModule(m.id)}
                      />
                      <button
                        type="button"
                        onClick={() => openCreate(m.id)}
                        aria-label="Novo sub-módulo"
                        title="Novo sub-módulo"
                        className="shrink-0 cursor-pointer border-2 border-line/40 p-1.5 text-canvas-fg/40 hover:border-line hover:text-canvas-fg"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    {(childrenByParent.get(m.id) ?? []).length > 0 && (
                      <ul className="mt-1 ml-4 space-y-1 border-l-2 border-line/30 pl-2">
                        {(childrenByParent.get(m.id) ?? []).map((child) => (
                          <li key={child.id}>
                            <button
                              type="button"
                              onClick={() => selectModule(child.id)}
                              className={clsx(
                                'flex w-full cursor-pointer items-center gap-1.5 border-2 px-2.5 py-1.5 text-left text-xs transition-colors',
                                selected?.id === child.id
                                  ? 'border-line bg-accent-yellow text-ink'
                                  : 'border-line/30 bg-surface text-canvas-fg/70 hover:border-line',
                              )}
                            >
                              <CornerDownRight size={11} className="shrink-0 opacity-50" />
                              <span className="truncate">{child.title}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          {selected && (
            <div className="min-w-0 border-2 border-line bg-surface shadow-brutal">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line p-4">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  {selected.parent_id && <CornerDownRight size={14} className="text-canvas-fg/40" />}
                  <TextInput
                    value={selected.title}
                    onChange={(e) => updateModule.mutate({ id: selected.id, title: e.target.value })}
                    className="max-w-xs"
                  />
                  <Select
                    value={selected.phase}
                    onChange={(e) => updateModule.mutate({ id: selected.id, phase: e.target.value })}
                    className="max-w-[150px]"
                  >
                    {phaseItems.map((p) => (
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
                <RichTextEditor projectId={project.id} value={draft} onChange={setDraft} minHeight={300} />

                {(sectors ?? []).length > 0 && (
                  <div className="mt-5 border-t-2 border-line/30 pt-4">
                    <h3 className="text-label mb-3 text-xs text-canvas-fg/60">Setores</h3>
                    <SectorPicker
                      value={selected.sectors}
                      onChange={(value) => updateModule.mutate({ id: selected.id, sectors: value })}
                      sectors={sectors ?? []}
                    />
                  </div>
                )}

                <div className="mt-5 border-t-2 border-line/30 pt-4">
                  <h3 className="text-label mb-3 text-xs text-canvas-fg/60">Campos extras</h3>
                  <ExtraFieldsEditor fields={draftExtraFields} onChange={setDraftExtraFields} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={creatingParentId ? 'Novo sub-módulo' : 'Novo módulo'}
        isDirty={Boolean(newTitle.trim())}
      >
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
            <Select value={newPhase} onChange={(e) => setNewPhase(e.target.value)}>
              {phaseItems.map((p) => (
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
        description="O conteúdo desse módulo (e dos sub-módulos, se houver) será apagado permanentemente."
        confirmLabel="Excluir"
      />
    </div>
  )
}
