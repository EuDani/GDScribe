import { useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, type DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CornerDownRight, Plus, Search, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, TextInput } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { RichTextEditor } from '@/components/RichTextEditor'
import { stripHtml } from '@/lib/html'
import type { Project, StoryBlock } from '@/lib/types'
import { StoryBlockListItem } from '@/features/story/StoryBlockListItem'
import {
  useCreateStoryBlock,
  useDeleteStoryBlock,
  useReorderStoryBlocks,
  useStoryBlocks,
  useUpdateStoryBlock,
} from '@/features/story/useStoryBlocks'

export function StoryPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: blocks, isLoading } = useStoryBlocks(project.id)
  const createBlock = useCreateStoryBlock(project.id)
  const updateBlock = useUpdateStoryBlock(project.id)
  const deleteBlock = useDeleteStoryBlock(project.id)
  const reorderBlocks = useReorderStoryBlocks(project.id)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [creating, setCreating] = useState(false)
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const topLevel = useMemo(() => (blocks ?? []).filter((b) => !b.parent_id), [blocks])

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return []
    return (blocks ?? [])
      .map((b) => {
        const plain = stripHtml(b.content ?? '')
        const titleMatch = b.title.toLowerCase().includes(query)
        const idx = plain.toLowerCase().indexOf(query)
        if (!titleMatch && idx < 0) return null
        const snippetStart = Math.max(0, idx - 40)
        const snippet =
          idx >= 0
            ? `${snippetStart > 0 ? '…' : ''}${plain.slice(snippetStart, idx + query.length + 40)}${idx + query.length + 40 < plain.length ? '…' : ''}`
            : ''
        return { block: b, snippet }
      })
      .filter((x): x is { block: StoryBlock; snippet: string } => x !== null)
  }, [blocks, search])
  const childrenByParent = useMemo(() => {
    const map = new Map<string, StoryBlock[]>()
    for (const b of blocks ?? []) {
      if (!b.parent_id) continue
      const list = map.get(b.parent_id) ?? []
      list.push(b)
      map.set(b.parent_id, list)
    }
    return map
  }, [blocks])

  const selected = blocks?.find((b) => b.id === selectedId) ?? topLevel[0] ?? null

  useEffect(() => {
    setDraft(selected?.content ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  const isDirty = selected ? draft !== (selected.content ?? '') : false

  function persist(id: string, content: string) {
    updateBlock.mutate({ id, content })
  }

  function flush() {
    if (selected && isDirty) persist(selected.id, draft)
  }

  function selectBlock(id: string) {
    flush()
    setSelectedId(id)
  }

  useEffect(() => {
    if (!selected || !isDirty) return
    const t = setTimeout(() => persist(selected.id, draft), 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  const flushRef = useRef(flush)
  flushRef.current = flush
  useEffect(() => () => flushRef.current(), [])

  function openCreate(parentId: string | null) {
    setCreatingParentId(parentId)
    setNewTitle('')
    setCreating(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const created = await createBlock.mutateAsync({ title: newTitle.trim(), parentId: creatingParentId })
    selectBlock(created.id)
    setNewTitle('')
    setCreating(false)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = topLevel.findIndex((b) => b.id === active.id)
    const newIndex = topLevel.findIndex((b) => b.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = [...topLevel]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    reorderBlocks.mutate(reordered.map((b, i) => ({ id: b.id, sort_order: i })))
  }

  return (
    <div className="flex h-full min-h-[70vh] flex-col">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl">História</h1>
        <Button size="sm" icon={<Plus size={16} />} onClick={() => openCreate(null)}>
          Novo bloco
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2 border-2 border-line bg-paper px-3 py-2 text-ink">
        <Search size={15} className="shrink-0 text-ink/50" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar uma palavra em toda a história…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
        />
      </div>

      {isLoading && <p className="text-label text-sm text-canvas-fg/50">Carregando…</p>}

      {search.trim() !== '' && (
        <div className="mb-5">
          {searchResults.length === 0 ? (
            <p className="text-sm text-canvas-fg/40">Nenhum resultado para "{search.trim()}".</p>
          ) : (
            <ul className="space-y-1.5">
              {searchResults.map(({ block, snippet }) => (
                <li key={block.id}>
                  <button
                    type="button"
                    onClick={() => {
                      selectBlock(block.id)
                      setSearch('')
                    }}
                    className="w-full cursor-pointer border-2 border-line/40 bg-surface p-2.5 text-left hover:border-line"
                  >
                    <p className="text-sm font-semibold text-canvas-fg">{block.title}</p>
                    {snippet && <p className="mt-0.5 truncate text-xs text-canvas-fg/50">{snippet}</p>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!isLoading && topLevel.length === 0 && (
        <EmptyState
          title="Nenhum bloco de história ainda"
          description="Crie capítulos, cenas ou beats narrativos — arraste para reordenar."
          action={
            <Button icon={<Plus size={16} />} onClick={() => openCreate(null)}>
              Criar bloco
            </Button>
          }
        />
      )}

      {!isLoading && topLevel.length > 0 && (
        <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={topLevel.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1.5">
                {topLevel.map((block) => (
                  <li key={block.id}>
                    <div className="flex items-center gap-1">
                      <StoryBlockListItem
                        block={block}
                        active={selected?.id === block.id}
                        onClick={() => selectBlock(block.id)}
                      />
                      <button
                        type="button"
                        onClick={() => openCreate(block.id)}
                        aria-label="Novo sub-bloco"
                        title="Novo sub-bloco"
                        className="shrink-0 cursor-pointer border-2 border-line/40 p-1.5 text-canvas-fg/40 hover:border-line hover:text-canvas-fg"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    {(childrenByParent.get(block.id) ?? []).length > 0 && (
                      <ul className="mt-1 ml-4 space-y-1 border-l-2 border-line/30 pl-2">
                        {(childrenByParent.get(block.id) ?? []).map((child) => (
                          <li key={child.id}>
                            <button
                              type="button"
                              onClick={() => selectBlock(child.id)}
                              className={`flex w-full cursor-pointer items-center gap-1.5 border-2 px-2.5 py-1.5 text-left text-xs transition-colors ${
                                selected?.id === child.id
                                  ? 'border-line bg-accent-yellow text-ink'
                                  : 'border-line/30 bg-surface text-canvas-fg/70 hover:border-line'
                              }`}
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

          <AnimatePresence mode="wait">
            {selected && (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="min-w-0 border-2 border-line bg-surface shadow-brutal"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line p-4">
                  <div className="flex items-center gap-2">
                    {selected.parent_id && <CornerDownRight size={14} className="text-canvas-fg/40" />}
                    <TextInput
                      value={selected.title}
                      onChange={(e) => updateBlock.mutate({ id: selected.id, title: e.target.value })}
                      className="max-w-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-label text-[10px] text-canvas-fg/40">
                      {updateBlock.isPending ? 'Salvando…' : isDirty ? 'Alterações pendentes' : 'Salvo automaticamente'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(selected.id)}
                      aria-label="Excluir bloco"
                      className="cursor-pointer border-2 border-line p-1.5 text-canvas-fg/60 hover:bg-accent-red hover:text-canvas-fg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <RichTextEditor projectId={project.id} value={draft} onChange={setDraft} minHeight={360} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={creatingParentId ? 'Novo sub-bloco' : 'Novo bloco de história'}
        isDirty={Boolean(newTitle.trim())}
      >
        <form onSubmit={handleCreate}>
          <Field label="Título">
            <TextInput
              required
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Capítulo 1 — O Chamado"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createBlock.isPending}>
              Criar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteBlock.mutate(pendingDelete)
          setSelectedId(null)
        }}
        title="Excluir bloco"
        description="O conteúdo desse bloco (e dos sub-blocos, se houver) será apagado permanentemente."
        confirmLabel="Excluir"
      />
    </div>
  )
}
