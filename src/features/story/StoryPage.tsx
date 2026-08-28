import { useEffect, useRef, useState } from 'react'
import { DndContext, type DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, TextInput } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import type { Project } from '@/lib/types'
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
  const [newTitle, setNewTitle] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const selected = blocks?.find((b) => b.id === selectedId) ?? blocks?.[0] ?? null

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const created = await createBlock.mutateAsync(newTitle.trim())
    selectBlock(created.id)
    setNewTitle('')
    setCreating(false)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || !blocks || active.id === over.id) return
    const oldIndex = blocks.findIndex((b) => b.id === active.id)
    const newIndex = blocks.findIndex((b) => b.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = [...blocks]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    reorderBlocks.mutate(reordered.map((b, i) => ({ id: b.id, sort_order: i })))
  }

  return (
    <div className="flex h-full min-h-[70vh] flex-col">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl">História</h1>
        <Button size="sm" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
          Novo bloco
        </Button>
      </div>

      {isLoading && <p className="text-label text-sm text-canvas-fg/50">Carregando…</p>}

      {!isLoading && blocks?.length === 0 && (
        <EmptyState
          title="Nenhum bloco de história ainda"
          description="Crie capítulos, cenas ou beats narrativos — arraste para reordenar."
          action={
            <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
              Criar bloco
            </Button>
          }
        />
      )}

      {!isLoading && blocks && blocks.length > 0 && (
        <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1.5">
                {blocks.map((block) => (
                  <li key={block.id}>
                    <StoryBlockListItem
                      block={block}
                      active={selected?.id === block.id}
                      onClick={() => selectBlock(block.id)}
                    />
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
                  <TextInput
                    value={selected.title}
                    onChange={(e) => updateBlock.mutate({ id: selected.id, title: e.target.value })}
                    className="max-w-sm"
                  />
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
                  <MarkdownEditor projectId={project.id} value={draft} onChange={setDraft} rows={20} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Novo bloco de história">
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
        description="O conteúdo desse bloco será apagado permanentemente."
        confirmLabel="Excluir"
      />
    </div>
  )
}
