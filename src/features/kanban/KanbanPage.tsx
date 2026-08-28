import { useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, TextInput, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { KanbanCard, Project } from '@/lib/types'
import { KanbanColumnView } from '@/features/kanban/KanbanColumn'
import {
  useCreateCard,
  useCreateColumn,
  useDeleteCard,
  useDeleteColumn,
  useKanbanCards,
  useKanbanColumns,
  useMoveCards,
  useUpdateCard,
} from '@/features/kanban/useKanban'

const COLUMN_COLORS = [
  'var(--color-accent-blue)',
  'var(--color-accent-yellow)',
  'var(--color-accent-green)',
  'var(--color-accent-red)',
  'var(--color-accent-purple)',
]

export function KanbanPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: columns, isLoading: columnsLoading } = useKanbanColumns(project.id)
  const { data: cards } = useKanbanCards(project.id)
  const createColumn = useCreateColumn(project.id)
  const deleteColumn = useDeleteColumn(project.id)
  const createCard = useCreateCard(project.id)
  const updateCard = useUpdateCard(project.id)
  const deleteCard = useDeleteCard(project.id)
  const moveCards = useMoveCards(project.id)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const [columnModalOpen, setColumnModalOpen] = useState(false)
  const [columnName, setColumnName] = useState('')
  const [pendingDeleteColumn, setPendingDeleteColumn] = useState<string | null>(null)

  const [cardModalColumnId, setCardModalColumnId] = useState<string | null>(null)
  const [cardTitle, setCardTitle] = useState('')
  const [cardDescription, setCardDescription] = useState('')

  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [pendingDeleteCard, setPendingDeleteCard] = useState<string | null>(null)

  function cardsFor(columnId: string) {
    return (cards ?? [])
      .filter((c) => c.column_id === columnId)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  async function handleCreateColumn(e: React.FormEvent) {
    e.preventDefault()
    if (!columnName.trim()) return
    const color = COLUMN_COLORS[(columns?.length ?? 0) % COLUMN_COLORS.length]
    await createColumn.mutateAsync({ name: columnName.trim(), color })
    setColumnName('')
    setColumnModalOpen(false)
  }

  async function handleCreateCard(e: React.FormEvent) {
    e.preventDefault()
    if (!cardModalColumnId || !cardTitle.trim()) return
    await createCard.mutateAsync({
      columnId: cardModalColumnId,
      title: cardTitle.trim(),
      description: cardDescription.trim(),
    })
    setCardTitle('')
    setCardDescription('')
    setCardModalColumnId(null)
  }

  function openEditCard(card: KanbanCard) {
    setEditingCard(card)
    setEditTitle(card.title)
    setEditDescription(card.description ?? '')
  }

  async function handleSaveCard(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCard) return
    await updateCard.mutateAsync({
      id: editingCard.id,
      title: editTitle.trim(),
      description: editDescription.trim() || null,
    })
    setEditingCard(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || !cards) return

    const activeCard = cards.find((c) => c.id === active.id)
    if (!activeCard) return

    const overIsColumn = over.data.current?.type === 'column'
    const targetColumnId = overIsColumn ? (over.id as string) : (over.data.current?.columnId as string)
    if (!targetColumnId) return

    const sourceColumnId = activeCard.column_id
    const sourceList = cardsFor(sourceColumnId).filter((c) => c.id !== activeCard.id)
    const targetList =
      sourceColumnId === targetColumnId ? sourceList : cardsFor(targetColumnId).filter((c) => c.id !== activeCard.id)

    let insertIndex = targetList.length
    if (!overIsColumn) {
      const overIndex = targetList.findIndex((c) => c.id === over.id)
      if (overIndex >= 0) insertIndex = overIndex
    }
    targetList.splice(insertIndex, 0, activeCard)

    const updates = [
      ...targetList.map((c, i) => ({ id: c.id, column_id: targetColumnId, sort_order: i })),
      ...(sourceColumnId !== targetColumnId
        ? sourceList.map((c, i) => ({ id: c.id, column_id: sourceColumnId, sort_order: i }))
        : []),
    ]

    moveCards.mutate(updates)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl">Kanban de Ações</h1>
        <Button size="sm" icon={<Plus size={16} />} onClick={() => setColumnModalOpen(true)}>
          Nova coluna
        </Button>
      </div>

      {columnsLoading && <p className="text-label text-sm text-paper/50">Carregando…</p>}

      {!columnsLoading && columns?.length === 0 && (
        <EmptyState title="Nenhuma coluna ainda" description="Crie a primeira coluna do seu quadro." />
      )}

      {!columnsLoading && columns && columns.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((column) => (
              <KanbanColumnView
                key={column.id}
                column={column}
                cards={cardsFor(column.id)}
                onAddCard={() => setCardModalColumnId(column.id)}
                onDeleteColumn={() => setPendingDeleteColumn(column.id)}
                onCardClick={openEditCard}
              />
            ))}
          </div>
        </DndContext>
      )}

      <Modal open={columnModalOpen} onClose={() => setColumnModalOpen(false)} title="Nova coluna">
        <form onSubmit={handleCreateColumn}>
          <Field label="Nome">
            <TextInput
              required
              autoFocus
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="Ex: Em revisão"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setColumnModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Criar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(cardModalColumnId)} onClose={() => setCardModalColumnId(null)} title="Novo card">
        <form onSubmit={handleCreateCard}>
          <Field label="Título">
            <TextInput required autoFocus value={cardTitle} onChange={(e) => setCardTitle(e.target.value)} />
          </Field>
          <Field label="Descrição" hint="Opcional">
            <Textarea rows={3} value={cardDescription} onChange={(e) => setCardDescription(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCardModalColumnId(null)}>
              Cancelar
            </Button>
            <Button type="submit">Criar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(editingCard)} onClose={() => setEditingCard(null)} title="Editar card">
        <form onSubmit={handleSaveCard}>
          <Field label="Título">
            <TextInput required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </Field>
          <Field label="Descrição">
            <Textarea rows={4} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
          </Field>
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (editingCard) setPendingDeleteCard(editingCard.id)
              }}
            >
              Excluir
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingCard(null)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDeleteColumn)}
        onClose={() => setPendingDeleteColumn(null)}
        onConfirm={() => pendingDeleteColumn && deleteColumn.mutate(pendingDeleteColumn)}
        title="Excluir coluna"
        description="Os cards dessa coluna serão apagados junto."
        confirmLabel="Excluir"
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteCard)}
        onClose={() => setPendingDeleteCard(null)}
        onConfirm={() => {
          if (pendingDeleteCard) deleteCard.mutate(pendingDeleteCard)
          setEditingCard(null)
        }}
        title="Excluir card"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  )
}
